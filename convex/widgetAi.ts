import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { widgetAgent, rag } from "./lib/ai";
import { sourceValidator } from "./lib/inbox";
import {
  enforceRateLimit,
  checkAiMessageQuota,
  QUOTA_METRICS,
} from "./lib/quota";

/**
 * PHASE 7 — Widget AI integration.
 *
 * When a visitor sends a message in the embedded widget (convex/widget.ts) and
 * the conversation is NOT under human takeover, that mutation schedules
 * `internal.widgetAi.generateAnswer`. This action:
 *
 *   1. Re-checks the AI gate (the agent may have taken over between schedule and
 *      run) and enforces the per-org AI rate limit + monthly quota.
 *   2. Creates/continues a per-conversation Agent thread (owned by `orgId`).
 *   3. Runs RAG retrieval scoped to the workspace's `orgId` namespace.
 *   4. Streams a gpt-4o-mini answer token-by-token (Agent delta streaming, saved
 *      to the DB so the widget reads it reactively over websockets) WITH source
 *      citations.
 *   5. Persists the final answer as a Phase 2 `messages` row (authorType "ai")
 *      with its sources, so the answer also appears in the agent inbox + thread
 *      history and survives independent of the Agent thread.
 *
 * Tenancy: orgId is always derived server-side (the widget mutation resolves it
 * from the workspace publicKey before scheduling) and passed in here — never
 * trusted from a client. Actions cannot use ctx.db, so all reads/writes go
 * through the internal query/mutation helpers below.
 */

// Monthly AI-answer quota metric (Phase 5 usageMeters). The per-month CAP is
// now PLAN-DERIVED (convex/lib/quota.ts → PLAN_LIMITS), mirroring the Clerk
// billing tiers, instead of a hardcoded number. The gate stays graceful: on
// exhaustion we post a fallback message and never error to the visitor.
const AI_MESSAGE_METRIC = QUOTA_METRICS.aiMessages;

const FALLBACK_MESSAGE =
  "Thanks for your message! Our AI assistant is taking a quick break right now, " +
  "but a member of our team will follow up with you shortly.";

/** Current monthly period bucket (e.g. "2026-06") in UTC. */
function monthlyPeriod(now: number): string {
  const d = new Date(now);
  const month = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}`;
}

/**
 * Generate (and stream) an AI answer for a visitor message. Scheduled from
 * convex/widget.ts. All inputs are server-derived; never call from the client.
 */
export const generateAnswer = internalAction({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const question = args.prompt.trim();
    if (question.length === 0) {
      return null;
    }

    // 1. Re-check the AI gate at run time (the agent may have taken over after
    //    this action was scheduled). If AI is disabled, do nothing.
    const gate = await ctx.runQuery(internal.widgetAi.getThreadState, {
      conversationId: args.conversationId,
    });
    if (gate !== null && gate.aiEnabled === false) {
      return null;
    }

    // 2. Quota + rate limiting (Phase 5). On exhaustion, post a graceful
    //    fallback as an AI message instead of an answer — never error to the
    //    visitor, never call OpenAI.
    const rl = await enforceRateLimit(ctx, "aiMessage", args.orgId);
    if (!rl.ok) {
      await ctx.runMutation(internal.widgetAi.recordAiMessage, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        body: FALLBACK_MESSAGE,
        sources: [],
      });
      return null;
    }
    // Plan-derived monthly AI-message cap (mirrors Clerk billing tiers). The
    // meter itself is incremented in `recordAiMessage` when an answer is saved,
    // so this is a non-consuming pre-check.
    const quota = await checkAiMessageQuota(ctx, args.orgId, Date.now());
    if (!quota.ok) {
      await ctx.runMutation(internal.widgetAi.recordAiMessage, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        body: FALLBACK_MESSAGE,
        sources: [],
      });
      return null;
    }

    // 3. Ensure a per-conversation Agent thread exists (create lazily). The
    //    thread is owned by orgId for tenant-isolated streaming/listing. A row
    //    may exist with an empty threadId placeholder (created when an agent
    //    pre-toggled the AI gate before any answer) — treat "" as "no thread".
    let threadId =
      gate !== null && gate.threadId.length > 0 ? gate.threadId : null;
    if (threadId === null) {
      const created = await widgetAgent.createThread(ctx, {
        userId: args.orgId,
        title: "Widget conversation",
      });
      threadId = created.threadId;
      await ctx.runMutation(internal.widgetAi.ensureThreadRow, {
        orgId: args.orgId,
        conversationId: args.conversationId,
        threadId,
      });
    }

    // 4. RAG retrieval scoped to the workspace namespace (mirrors askKb.ask).
    const {
      entries,
      results,
      text: contextText,
    } = await rag.search(ctx, {
      namespace: args.orgId,
      query: question,
      limit: 8,
      vectorScoreThreshold: 0.3,
      chunkContext: { before: 1, after: 1 },
    });

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

    const system =
      sources.length === 0
        ? "You are a friendly support assistant chatting with a website " +
          "visitor. The knowledge base returned no relevant content for this " +
          "question. Tell the visitor you're not sure and offer to connect " +
          "them with the support team. Do not fabricate an answer."
        : "You are a friendly support assistant chatting with a website " +
          "visitor. Answer using ONLY the knowledge base context below. Keep " +
          "it short and conversational. If the context is insufficient, say so " +
          "and offer to connect them with the team. Cite sources inline like " +
          "[Source: <title>].\n\n--- KNOWLEDGE BASE CONTEXT ---\n" +
          contextText +
          "\n--- END CONTEXT ---";

    // 5. Stream the answer into the thread. Deltas are saved so the widget
    //    receives tokens reactively over websockets via the streaming query.
    let answerText = "";
    try {
      const result = await widgetAgent.streamText(
        ctx,
        { threadId, userId: args.orgId },
        { system, prompt: question },
        { saveStreamDeltas: true },
      );
      await result.consumeStream();
      answerText = (await result.text) ?? "";
    } catch {
      // On any model failure, fall back gracefully rather than leaving the
      // visitor hanging.
      answerText = FALLBACK_MESSAGE;
    }

    const finalText = answerText.trim().length > 0 ? answerText : FALLBACK_MESSAGE;
    const finalSources = finalText === FALLBACK_MESSAGE ? [] : sources;

    // 6. Persist the final answer as a Phase 2 message (authorType "ai") and
    //    meter usage. This surfaces the answer in the agent inbox + thread.
    await ctx.runMutation(internal.widgetAi.recordAiMessage, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      body: finalText,
      sources: finalSources,
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal helpers (actions can't touch ctx.db directly).
// ---------------------------------------------------------------------------

const threadStateValidator = v.object({
  threadId: v.string(),
  aiEnabled: v.boolean(),
});

/** Read the conversation's thread mapping + AI gate, or null if none yet. */
export const getThreadState = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.union(v.null(), threadStateValidator),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("conversationThreads")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .unique();
    if (row === null) {
      return null;
    }
    return { threadId: row.threadId, aiEnabled: row.aiEnabled };
  },
});

/** Read a monthly usage meter count for an org (0 when absent). */
export const usageForPeriod = internalQuery({
  args: { orgId: v.string(), metric: v.string(), period: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("usageMeters")
      .withIndex("by_org_and_metric_and_period", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("metric", args.metric)
          .eq("period", args.period),
      )
      .unique();
    return row?.count ?? 0;
  },
});

/**
 * Create the conversation→thread mapping row if absent (AI enabled by default).
 * Idempotent under the unique by_conversation index.
 */
export const ensureThreadRow = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    threadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationThreads")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .unique();
    if (existing === null) {
      await ctx.db.insert("conversationThreads", {
        orgId: args.orgId,
        conversationId: args.conversationId,
        threadId: args.threadId,
        aiEnabled: true,
      });
    } else if (existing.threadId !== args.threadId) {
      await ctx.db.patch(existing._id, { threadId: args.threadId });
    }
    return null;
  },
});

/**
 * Persist the final AI answer as a `messages` row (authorType "ai") and bump
 * the conversation recency + AI usage meter — all in one transaction.
 */
export const recordAiMessage = internalMutation({
  args: {
    orgId: v.string(),
    conversationId: v.id("conversations"),
    body: v.string(),
    sources: v.array(sourceValidator),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== args.orgId) {
      throw new Error("Conversation not found");
    }
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      orgId: args.orgId,
      conversationId: args.conversationId,
      authorType: "ai",
      body: args.body,
      sources: args.sources.length > 0 ? args.sources : undefined,
    });
    // AI replies keep the conversation open and recent (like an agent reply);
    // they do NOT increment the agent-facing unread counter.
    await ctx.db.patch(args.conversationId, {
      status: "open",
      lastMessageAt: now,
    });

    // Meter monthly AI usage (Phase 5 usageMeters) for quota enforcement.
    const period = monthlyPeriod(now);
    const meter = await ctx.db
      .query("usageMeters")
      .withIndex("by_org_and_metric_and_period", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("metric", AI_MESSAGE_METRIC)
          .eq("period", period),
      )
      .unique();
    if (meter === null) {
      await ctx.db.insert("usageMeters", {
        orgId: args.orgId,
        metric: AI_MESSAGE_METRIC,
        period,
        count: 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(meter._id, {
        count: meter.count + 1,
        updatedAt: now,
      });
    }

    return messageId;
  },
});

// Re-export for the widget mutation's scheduler call site reference type.
export type GenerateAnswerArgs = {
  orgId: string;
  conversationId: Id<"conversations">;
  prompt: string;
};
