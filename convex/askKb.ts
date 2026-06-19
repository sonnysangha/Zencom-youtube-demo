import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  listMessages,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { components } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { getOrgContext } from "./lib/auth";
import { kbAgent, rag } from "./lib/ai";
import {
  enforceRateLimit,
  checkAiMessageQuota,
  recordAiMessageUsage,
} from "./lib/quota";

/**
 * Phase 3 — Standalone "Ask KB" surface.
 *
 * Validates the RAG core end-to-end without the widget: a workspace-scoped
 * question retrieves relevant chunks from the org's RAG namespace, then a
 * gpt-4o-mini answer is streamed token-by-token via the Agent component's delta
 * streaming (persisted to the DB, synced over websockets to all clients) WITH
 * source citations.
 *
 * Tenancy: the Agent thread is owned by the workspace (`userId = orgId`) so a
 * member only ever sees / streams their own workspace's threads. Org context is
 * derived server-side from the Clerk JWT (actions can't use the org wrappers).
 */

async function requireOrg(
  ctx: ActionCtx | MutationCtx | QueryCtx,
): Promise<{ orgId: string; userId: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  const { orgId, userId } = getOrgContext(identity);
  return { orgId, userId };
}

const sourceValidator = v.object({
  entryId: v.string(),
  title: v.optional(v.string()),
  score: v.number(),
});

/** Create a fresh Ask-KB thread scoped to the caller's workspace. */
export const createThread = mutation({
  args: {},
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx) => {
    const { orgId } = await requireOrg(ctx);
    const { threadId } = await kbAgent.createThread(ctx, {
      // Threads are workspace-owned so listing/streaming is naturally tenant
      // scoped by the same orgId.
      userId: orgId,
      title: "Ask the knowledge base",
    });
    return { threadId };
  },
});

/**
 * Ask a question. Retrieves workspace context from RAG, then streams a cited
 * gpt-4o-mini answer into the thread (deltas saved to the DB for reactive
 * websocket streaming). Returns the sources used for citation rendering.
 */
export const ask = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.object({
    sources: v.array(sourceValidator),
    // When true, the org hit its plan's monthly AI-message cap and no answer
    // was generated. The UI renders an upgrade prompt instead of a reply.
    quotaReached: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    const question = args.prompt.trim();
    if (question.length === 0) {
      throw new Error("Question cannot be empty");
    }

    // Quota + rate limiting. An Ask-KB answer counts as one AI message, sharing
    // the same plan-derived monthly cap + usageMeters keys as the widget AI.
    // On exhaustion we return a graceful `quotaReached` result rather than
    // throwing or calling OpenAI.
    const rl = await enforceRateLimit(ctx, "aiMessage", orgId);
    if (!rl.ok) {
      return { sources: [], quotaReached: true };
    }
    const quota = await checkAiMessageQuota(ctx, orgId, Date.now());
    if (!quota.ok) {
      return { sources: [], quotaReached: true };
    }

    // 1. Retrieve relevant context from the workspace's RAG namespace.
    const {
      entries,
      results,
      text: contextText,
    } = await rag.search(ctx, {
      namespace: orgId,
      query: question,
      limit: 8,
      vectorScoreThreshold: 0.3,
      chunkContext: { before: 1, after: 1 },
    });

    // Scores live on `results` (per matching chunk). Surface the best score per
    // source entry for citation ranking in the UI.
    const bestScoreByEntry = new Map<string, number>();
    for (const r of results) {
      const prev = bestScoreByEntry.get(r.entryId as string) ?? 0;
      if (r.score > prev) {
        bestScoreByEntry.set(r.entryId as string, r.score);
      }
    }

    const sources = entries.map((e) => ({
      entryId: e.entryId as string,
      title: e.title ?? undefined,
      score: bestScoreByEntry.get(e.entryId as string) ?? 0,
    }));

    // 2. Build the grounding system message from the retrieved context.
    const system =
      sources.length === 0
        ? "You are a support assistant for this workspace. The knowledge base " +
          "returned no relevant content for this question. Tell the user you " +
          "don't have that information in the knowledge base and suggest " +
          "contacting support. Do not fabricate an answer."
        : "You are a support assistant for this workspace. Answer the user's " +
          "question using ONLY the knowledge base context below. If the context " +
          "is insufficient, say so. Cite the source titles you used inline like " +
          "[Source: <title>].\n\n--- KNOWLEDGE BASE CONTEXT ---\n" +
          contextText +
          "\n--- END CONTEXT ---";

    // 3. Stream the answer into the thread; deltas are persisted so every
    //    subscribed client receives the tokens reactively over websockets.
    const result = await kbAgent.streamText(
      ctx,
      { threadId: args.threadId, userId: orgId },
      { system, prompt: question },
      { saveStreamDeltas: true },
    );

    // Drain the stream so the action stays alive until generation completes and
    // all deltas are saved. The client reads the text via the streaming query.
    await result.consumeStream();

    // Meter this answer as one AI message (same metric/period as the widget AI)
    // so the monthly plan cap is shared across both surfaces.
    await recordAiMessageUsage(ctx, orgId, Date.now());

    return { sources };
  },
});

/**
 * Streaming-aware message list for the `useThreadMessages` hook. Returns both
 * persisted messages (paginated) and in-flight stream deltas. Access is scoped
 * to the caller's workspace by re-deriving orgId and matching the thread owner.
 */
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(vStreamArgs),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrg(ctx);

    // Tenant check: the thread must belong to this workspace.
    const thread = await ctx.runQuery(
      components.agent.threads.getThread,
      { threadId: args.threadId },
    );
    if (thread === null || thread.userId !== orgId) {
      throw new Error("Thread not found");
    }

    const paginated = await listMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});
