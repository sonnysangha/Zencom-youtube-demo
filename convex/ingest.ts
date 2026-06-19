import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getOrgContext } from "./lib/auth";
import { rag } from "./lib/ai";
import { checkKbDocumentQuota } from "./lib/quota";

/**
 * Phase 3 — Document ingestion pipeline.
 *
 * Flow (admin-gated, all server-derived tenancy):
 *   1. Client uploads the raw file to Convex storage via an upload URL
 *      (`knowledge.generateUploadUrl`).
 *   2. Client calls `processUpload` with the storageId + metadata.
 *   3. We extract text: `.md`/`.txt` are decoded inline; `.pdf` is parsed in a
 *      SEPARATE `"use node"` action (`pdf.extractPdfText`) so this file stays in
 *      the default runtime.
 *   4. The text is chunked + embedded into the RAG component under the org's
 *      namespace (= orgId), keyed by the document id so re-ingesting replaces
 *      the previous version gracefully.
 *   5. The `documents` row is patched with status + chunk count.
 *
 * Actions can't use the org-scoped custom-function wrappers (those wrap
 * query/mutation), so org context is derived here directly from the Clerk JWT
 * and admin role is enforced before any work happens.
 */

async function requireAdminOrg(ctx: ActionCtx): Promise<{
  orgId: string;
  userId: string;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  const { orgId, userId, orgRole } = getOrgContext(identity);
  if (orgRole !== "org:admin") {
    throw new Error("Forbidden: admin access required");
  }
  return { orgId, userId };
}

/**
 * Enforce the plan-derived knowledge-base document quota before ingesting a new
 * document. On exhaustion, throw a `ConvexError` carrying a structured payload
 * (`code: "quota_reached"`, the plan, the cap) so the UI can render an upgrade
 * prompt — this is application data surfaced cleanly to the client, NOT an
 * unhandled server error. Enterprise (unlimited) passes without a count.
 */
async function enforceKbDocumentQuota(
  ctx: ActionCtx,
  orgId: string,
): Promise<void> {
  const quota = await checkKbDocumentQuota(ctx, orgId);
  if (!quota.ok) {
    throw new ConvexError({
      code: "quota_reached",
      metric: "kb_documents",
      plan: quota.plan,
      limit: quota.limit,
      message:
        `Your plan's knowledge-base document limit (${quota.limit}) has been ` +
        `reached. Delete a document or upgrade your plan to add more.`,
    });
  }
}

const fileTypeValidator = v.union(
  v.literal("md"),
  v.literal("txt"),
  v.literal("pdf"),
);

/**
 * Process an uploaded document end-to-end: extract text, embed into RAG, and
 * record the result on the `documents` row.
 */
export const processUpload = action({
  args: {
    storageId: v.id("_storage"),
    source: v.string(),
    fileType: fileTypeValidator,
  },
  returns: v.object({
    documentId: v.id("documents"),
    chunkCount: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ documentId: Id<"documents">; chunkCount: number }> => {
    const { orgId, userId } = await requireAdminOrg(ctx);

    // Plan-derived KB-document quota: refuse before doing any storage read /
    // embedding work when the org is at its cap.
    await enforceKbDocumentQuota(ctx, orgId);

    const documentId = await ctx.runMutation(
      internal.knowledge.insertDocument,
      {
        orgId,
        source: args.source,
        fileType: args.fileType,
        storageId: args.storageId,
        uploadedBy: userId,
      },
    );

    try {
      await ctx.runMutation(internal.knowledge.patchDocument, {
        documentId,
        status: "processing",
      });

      // Extract plain text from the uploaded file.
      let text: string;
      if (args.fileType === "pdf") {
        text = await ctx.runAction(internal.pdf.extractPdfText, {
          storageId: args.storageId,
        });
      } else {
        const blob = await ctx.storage.get(args.storageId);
        if (blob === null) {
          throw new Error("Uploaded file not found in storage");
        }
        text = new TextDecoder().decode(await blob.arrayBuffer());
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) {
        throw new Error("No extractable text in document");
      }

      // Embed into the org's RAG namespace. Keying by documentId means a future
      // re-ingest of the same logical document replaces the prior entry.
      const { entryId } = await rag.add(ctx, {
        namespace: orgId,
        key: documentId,
        title: args.source,
        text: trimmed,
        metadata: { documentId, source: args.source },
      });

      // Approximate chunk count from the formatted entry text is unreliable, so
      // we record a coarse estimate based on content length (chunks are ~ a few
      // hundred tokens each). The RAG component owns the authoritative chunks.
      const chunkCount = Math.max(1, Math.ceil(trimmed.length / 2000));

      await ctx.runMutation(internal.knowledge.patchDocument, {
        documentId,
        status: "ready",
        ragEntryId: entryId,
        chunkCount,
      });

      return { documentId, chunkCount };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ingestion error";
      await ctx.runMutation(internal.knowledge.patchDocument, {
        documentId,
        status: "error",
        error: message,
      });
      throw error;
    }
  },
});

/**
 * Ingest pasted/typed text directly (no file upload), e.g. a quick FAQ snippet.
 */
export const processText = action({
  args: {
    source: v.string(),
    text: v.string(),
  },
  returns: v.object({
    documentId: v.id("documents"),
    chunkCount: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ documentId: Id<"documents">; chunkCount: number }> => {
    const { orgId, userId } = await requireAdminOrg(ctx);

    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new Error("Cannot ingest empty text");
    }

    // Plan-derived KB-document quota: refuse before embedding work.
    await enforceKbDocumentQuota(ctx, orgId);

    const documentId = await ctx.runMutation(
      internal.knowledge.insertDocument,
      {
        orgId,
        source: args.source,
        fileType: "txt",
        uploadedBy: userId,
      },
    );

    try {
      const { entryId } = await rag.add(ctx, {
        namespace: orgId,
        key: documentId,
        title: args.source,
        text: trimmed,
        metadata: { documentId, source: args.source },
      });

      const chunkCount = Math.max(1, Math.ceil(trimmed.length / 2000));

      await ctx.runMutation(internal.knowledge.patchDocument, {
        documentId,
        status: "ready",
        ragEntryId: entryId,
        chunkCount,
      });

      return { documentId, chunkCount };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ingestion error";
      await ctx.runMutation(internal.knowledge.patchDocument, {
        documentId,
        status: "error",
        error: message,
      });
      throw error;
    }
  },
});
