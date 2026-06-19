import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { orgMutation, orgQuery } from "./lib/customFunctions";
import {
  PRESENCE_TTL_MS,
  TYPING_TTL_MS,
  conversationValidator,
  inboxConversationValidator,
  messageValidator,
  preview,
  statusValidator,
  visitorSessionValidator,
  type InboxConversation,
} from "./lib/inbox";

/**
 * AUTHED agent-facing inbox API. Everything here goes through orgQuery /
 * orgMutation, so `ctx.orgId` / `ctx.userId` / `ctx.orgRole` are derived from
 * the Clerk JWT — no orgId is ever accepted from the client. Every read is
 * index-bounded to the caller's org, and every mutation re-verifies that the
 * target conversation belongs to `ctx.orgId` before writing.
 */

const filterValidator = v.union(
  v.literal("all"),
  v.literal("unread"),
  v.literal("unassigned"),
  v.literal("mine"),
);

/**
 * Paginated, filterable inbox list. Filters:
 *   all        — every conversation in the org
 *   unread     — unreadCount > 0
 *   unassigned — no assignee
 *   mine       — assigned to the calling agent
 * Sorted by recency (lastMessageAt desc) and enriched with the visitor name +
 * a last-message preview for the list UI.
 */
export const listConversations = orgQuery({
  args: {
    filter: filterValidator,
    status: v.optional(statusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(inboxConversationValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // Use the status index when a status is supplied, else the org index.
    const base =
      args.status !== undefined
        ? ctx.db
            .query("conversations")
            .withIndex("by_org_and_status", (q) =>
              q.eq("orgId", ctx.orgId).eq("status", args.status!),
            )
        : ctx.db
            .query("conversations")
            .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId));

    const result = await base.order("desc").paginate(args.paginationOpts);

    // Apply the in-memory filter on the bounded page, then enrich.
    const filtered = result.page.filter((c) => {
      switch (args.filter) {
        case "unread":
          return c.unreadCount > 0;
        case "unassigned":
          return c.assigneeId === undefined;
        case "mine":
          return c.assigneeId === ctx.userId;
        case "all":
        default:
          return true;
      }
    });

    const enriched: InboxConversation[] = await Promise.all(
      filtered.map(async (c) => {
        const visitor = await ctx.db.get(c.visitorId);
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", c._id),
          )
          .order("desc")
          .first();
        return {
          ...c,
          visitorName: visitor?.name,
          visitorEmail: visitor?.email,
          lastMessagePreview: lastMessage
            ? preview(lastMessage.body)
            : undefined,
          lastMessageAuthorType: lastMessage?.authorType,
        };
      }),
    );

    return {
      page: enriched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/** Org-wide unread + open badge counts for the inbox nav (bounded scan). */
export const inboxCounts = orgQuery({
  args: {},
  returns: v.object({
    open: v.number(),
    unread: v.number(),
    unassigned: v.number(),
  }),
  handler: async (ctx) => {
    const open = await ctx.db
      .query("conversations")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", ctx.orgId).eq("status", "open"),
      )
      .take(500);
    let unread = 0;
    let unassigned = 0;
    for (const c of open) {
      if (c.unreadCount > 0) unread += 1;
      if (c.assigneeId === undefined) unassigned += 1;
    }
    return { open: open.length, unread, unassigned };
  },
});

/** Single conversation + its visitor session, scoped to the caller's org. */
export const getConversation = orgQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.null(),
    v.object({
      conversation: conversationValidator,
      visitor: v.union(v.null(), visitorSessionValidator),
      // ===== PHASE 7: AI gate state for this conversation. =====
      // true = AI answers visitor messages; false = human takeover (AI off).
      // Default true when no AI thread row exists yet.
      aiEnabled: v.boolean(),
      // ===== END PHASE 7 =====
    }),
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      return null;
    }
    const visitor = await ctx.db.get(conversation.visitorId);
    // ===== PHASE 7: read the AI gate from conversationThreads. =====
    const threadRow = await ctx.db
      .query("conversationThreads")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .unique();
    const aiEnabled = threadRow === null ? true : threadRow.aiEnabled;
    // ===== END PHASE 7 =====
    return { conversation, visitor, aiEnabled };
  },
});

/** Paginated thread messages for one conversation (newest-first pages). */
export const listThread = orgQuery({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(messageValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      page: result.page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/** Live presence + typing for a conversation, from the agent's perspective. */
export const conversationActivity = orgQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.object({
    visitorOnline: v.boolean(),
    visitorTyping: v.boolean(),
    otherAgentsOnline: v.number(),
    otherAgentsTyping: v.number(),
  }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    const now = Date.now();
    const presenceRows = await ctx.db
      .query("presence")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .take(50);
    const typingRows = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .take(50);

    const visitorOnline = presenceRows.some(
      (r) => r.actorType === "visitor" && now - r.lastActiveAt < PRESENCE_TTL_MS,
    );
    const visitorTyping = typingRows.some(
      (r) => r.actorType === "visitor" && now - r.lastActiveAt < TYPING_TTL_MS,
    );
    const otherAgentsOnline = presenceRows.filter(
      (r) =>
        r.actorType === "agent" &&
        r.who !== ctx.userId &&
        now - r.lastActiveAt < PRESENCE_TTL_MS,
    ).length;
    const otherAgentsTyping = typingRows.filter(
      (r) =>
        r.actorType === "agent" &&
        r.who !== ctx.userId &&
        now - r.lastActiveAt < TYPING_TTL_MS,
    ).length;

    return { visitorOnline, visitorTyping, otherAgentsOnline, otherAgentsTyping };
  },
});

/** Send a message as the agent. Bumps recency; does not increment unread. */
export const sendAgentMessage = orgMutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    const body = args.body.trim();
    if (body.length === 0) {
      throw new Error("Message is empty");
    }
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      orgId: ctx.orgId,
      conversationId: args.conversationId,
      authorType: "agent",
      authorId: ctx.userId,
      body,
    });
    await ctx.db.patch(args.conversationId, {
      status: "open",
      lastMessageAt: now,
    });
    // Clear this agent's typing row.
    const typingRow = await ctx.db
      .query("typing")
      .withIndex("by_conversation_and_who", (q) =>
        q.eq("conversationId", args.conversationId).eq("who", ctx.userId),
      )
      .unique();
    if (typingRow) {
      await ctx.db.delete(typingRow._id);
    }
    return messageId;
  },
});

/** Mark all visitor messages as read (reset the unread counter to 0). */
export const markRead = orgMutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    if (conversation.unreadCount !== 0) {
      await ctx.db.patch(args.conversationId, { unreadCount: 0 });
    }
    return null;
  },
});

/** Assign (or unassign, with assigneeId omitted) a conversation. */
export const assign = orgMutation({
  args: {
    conversationId: v.id("conversations"),
    assigneeId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    await ctx.db.patch(args.conversationId, { assigneeId: args.assigneeId });
    return null;
  },
});

/**
 * Human takeover: assign the conversation to the calling agent and ensure it's
 * open. PHASE 7 — this also disables AI for the conversation so the assistant
 * stops answering once a human steps in. Re-enable via `setAiEnabled`.
 */
export const takeover = orgMutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    await ctx.db.patch(args.conversationId, {
      assigneeId: ctx.userId,
      status: "open",
    });
    // ===== PHASE 7: taking over disables AI for this conversation. =====
    await setAiGate(ctx, ctx.orgId, args.conversationId, false);
    // ===== END PHASE 7 =====
    return null;
  },
});

// ===== PHASE 7: explicit AI on/off toggle for a conversation. =====
/**
 * Enable or disable the AI assistant for a conversation. Disabling is the same
 * gate `takeover` flips; re-enabling hands the conversation back to the AI so
 * the next visitor message is answered automatically again.
 */
export const setAiEnabled = orgMutation({
  args: { conversationId: v.id("conversations"), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    await setAiGate(ctx, ctx.orgId, args.conversationId, args.enabled);
    return null;
  },
});

/**
 * Upsert the AI gate on the conversationThreads row. The row may not exist yet
 * (AI hasn't answered in this conversation), so we create it with an empty
 * threadId placeholder — the AI action fills in the real threadId on first run
 * (ensureThreadRow only overwrites the threadId, never the aiEnabled flag).
 */
async function setAiGate(
  ctx: MutationCtx,
  orgId: string,
  conversationId: Id<"conversations">,
  enabled: boolean,
): Promise<void> {
  const existing = await ctx.db
    .query("conversationThreads")
    .withIndex("by_conversation", (q) =>
      q.eq("conversationId", conversationId),
    )
    .unique();
  if (existing === null) {
    await ctx.db.insert("conversationThreads", {
      orgId,
      conversationId,
      threadId: "",
      aiEnabled: enabled,
    });
  } else {
    await ctx.db.patch(existing._id, { aiEnabled: enabled });
  }
}
// ===== END PHASE 7 =====

/** Open or close a conversation. */
export const setStatus = orgMutation({
  args: { conversationId: v.id("conversations"), status: statusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    await ctx.db.patch(args.conversationId, { status: args.status });
    return null;
  },
});

/** Agent presence/typing heartbeat for a conversation. */
export const heartbeat = orgMutation({
  args: {
    conversationId: v.id("conversations"),
    typing: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== ctx.orgId) {
      throw new Error("Conversation not found");
    }
    const now = Date.now();
    await upsertActivity(
      ctx,
      "presence",
      ctx.orgId,
      args.conversationId,
      ctx.userId,
      now,
    );
    if (args.typing) {
      await upsertActivity(
        ctx,
        "typing",
        ctx.orgId,
        args.conversationId,
        ctx.userId,
        now,
      );
    } else {
      const typingRow = await ctx.db
        .query("typing")
        .withIndex("by_conversation_and_who", (q) =>
          q.eq("conversationId", args.conversationId).eq("who", ctx.userId),
        )
        .unique();
      if (typingRow) {
        await ctx.db.delete(typingRow._id);
      }
    }
    return null;
  },
});

// Local upsert for agent presence/typing rows (actorType is always "agent").
async function upsertActivity(
  ctx: MutationCtx,
  table: "presence" | "typing",
  orgId: string,
  conversationId: Id<"conversations">,
  who: string,
  now: number,
): Promise<void> {
  const existing = await ctx.db
    .query(table)
    .withIndex("by_conversation_and_who", (q) =>
      q.eq("conversationId", conversationId).eq("who", who),
    )
    .unique();
  if (existing === null) {
    await ctx.db.insert(table, {
      orgId,
      conversationId,
      who,
      actorType: "agent",
      lastActiveAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, { lastActiveAt: now, actorType: "agent" });
  }
}
