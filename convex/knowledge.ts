import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { adminMutation, orgQuery } from "./lib/customFunctions";

/**
 * Phase 3 — Knowledge base CRUD (dashboard surface, admin-gated for writes).
 *
 * Articles are hand-authored help-center content. Documents are uploaded source
 * files tracked through the RAG ingestion pipeline (see `convex/ingest.ts`).
 *
 * All authed access goes through the org wrappers so `orgId` is derived from the
 * Clerk JWT, never from client args. Reads are bounded; writes that mutate KB
 * content additionally require `org:admin`.
 */

const articleValidator = v.object({
  _id: v.id("articles"),
  _creationTime: v.number(),
  orgId: v.string(),
  title: v.string(),
  slug: v.string(),
  category: v.string(),
  markdown: v.string(),
  coverImage: v.optional(v.string()),
  popular: v.boolean(),
  published: v.boolean(),
});

const documentValidator = v.object({
  _id: v.id("documents"),
  _creationTime: v.number(),
  orgId: v.string(),
  source: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("ready"),
    v.literal("error"),
  ),
  fileType: v.union(v.literal("md"), v.literal("txt"), v.literal("pdf")),
  storageId: v.optional(v.id("_storage")),
  ragEntryId: v.optional(v.string()),
  chunkCount: v.optional(v.number()),
  error: v.optional(v.string()),
  uploadedBy: v.optional(v.string()),
});

/** Normalize a title into a URL-safe slug. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Articles — queries
// ---------------------------------------------------------------------------

/** List every article in the caller's workspace (admin dashboard view). */
export const listArticles = orgQuery({
  args: {},
  returns: v.array(articleValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("articles")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .order("desc")
      .take(500);
  },
});

/** Fetch a single article by id, scoped to the caller's workspace. */
export const getArticle = orgQuery({
  args: { articleId: v.id("articles") },
  returns: v.union(v.null(), articleValidator),
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (article === null || article.orgId !== ctx.orgId) {
      return null;
    }
    return article;
  },
});

// ---------------------------------------------------------------------------
// Articles — mutations (admin-gated)
// ---------------------------------------------------------------------------

export const createArticle = adminMutation({
  args: {
    title: v.string(),
    category: v.string(),
    markdown: v.string(),
    coverImage: v.optional(v.string()),
    popular: v.boolean(),
    published: v.boolean(),
  },
  returns: v.id("articles"),
  handler: async (ctx, args) => {
    const baseSlug = slugify(args.title) || "article";

    // Ensure the slug is unique within the workspace.
    let slug = baseSlug;
    let suffix = 1;
    while (
      (await ctx.db
        .query("articles")
        .withIndex("by_org_and_slug", (q) =>
          q.eq("orgId", ctx.orgId).eq("slug", slug),
        )
        .unique()) !== null
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return await ctx.db.insert("articles", {
      orgId: ctx.orgId,
      title: args.title,
      slug,
      category: args.category,
      markdown: args.markdown,
      coverImage: args.coverImage,
      popular: args.popular,
      published: args.published,
    });
  },
});

export const updateArticle = adminMutation({
  args: {
    articleId: v.id("articles"),
    title: v.string(),
    category: v.string(),
    markdown: v.string(),
    coverImage: v.optional(v.string()),
    popular: v.boolean(),
    published: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.articleId);
    if (existing === null || existing.orgId !== ctx.orgId) {
      throw new Error("Article not found");
    }
    await ctx.db.patch(args.articleId, {
      title: args.title,
      category: args.category,
      markdown: args.markdown,
      coverImage: args.coverImage,
      popular: args.popular,
      published: args.published,
    });
    return null;
  },
});

export const deleteArticle = adminMutation({
  args: { articleId: v.id("articles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.articleId);
    if (existing === null || existing.orgId !== ctx.orgId) {
      throw new Error("Article not found");
    }
    await ctx.db.delete(args.articleId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Documents — queries
// ---------------------------------------------------------------------------

/** List uploaded source documents for the workspace (newest first). */
export const listDocuments = orgQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(documentValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
    ),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ---------------------------------------------------------------------------
// Documents — internal mutations used by the ingestion pipeline
// (called from actions in convex/ingest.ts which cannot use ctx.db directly).
// ---------------------------------------------------------------------------

/** Create the tracking row for a freshly uploaded document. */
export const insertDocument = internalMutation({
  args: {
    orgId: v.string(),
    source: v.string(),
    fileType: v.union(v.literal("md"), v.literal("txt"), v.literal("pdf")),
    storageId: v.optional(v.id("_storage")),
    uploadedBy: v.optional(v.string()),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      orgId: args.orgId,
      source: args.source,
      status: "pending",
      fileType: args.fileType,
      storageId: args.storageId,
      uploadedBy: args.uploadedBy,
    });
  },
});

/** Patch ingestion progress / completion onto a document row. */
export const patchDocument = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("error"),
      ),
    ),
    ragEntryId: v.optional(v.string()),
    chunkCount: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { documentId, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.ragEntryId !== undefined) patch.ragEntryId = rest.ragEntryId;
    if (rest.chunkCount !== undefined) patch.chunkCount = rest.chunkCount;
    if (rest.error !== undefined) patch.error = rest.error;
    await ctx.db.patch(documentId, patch);
    return null;
  },
});

/** Read a document row by id (for ingestion actions). */
export const getDocumentInternal = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(v.null(), documentValidator),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

/** Delete a document tracking row, scoped to the workspace (admin only). */
export const deleteDocument = adminMutation({
  args: { documentId: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.documentId);
    if (existing === null || existing.orgId !== ctx.orgId) {
      throw new Error("Document not found");
    }
    if (existing.storageId) {
      await ctx.storage.delete(existing.storageId);
    }
    await ctx.db.delete(args.documentId);
    return null;
  },
});

/** Generate a short-lived upload URL for a source document (admin only). */
export const generateUploadUrl = adminMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
