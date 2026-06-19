import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  PRESENCE_TTL_MS,
  TYPING_TTL_MS,
  authorizeVisitor,
  messageValidator,
  resolveWorkspaceByPublicKey,
} from "./lib/inbox";
// ===== PHASE 4: widget config + lead capture (additive imports) =====
import {
  resolveWidgetConfig,
  widgetConfigValidator,
} from "./lib/widgetConfig";
import { buildSearchText } from "./lib/leads";
// ===== END PHASE 4 imports =====

/**
 * PUBLIC widget API — called by the embedded /widget iframe with a PLAIN
 * (no-Clerk) Convex client. These functions are intentionally NOT wrapped by
 * orgQuery/orgMutation. Trust is derived from:
 *   - `publicKey` → resolves the workspace (and thus orgId) server-side.
 *   - `token`     → a per-visitor session token (crypto.randomUUID on the
 *                   client, persisted in localStorage).
 * A client-supplied orgId is NEVER accepted or trusted.
 */

/**
 * Resolve a workspace from its public key + create/lookup a visitor session by
 * token. Idempotent: a returning visitor (same token) is reused and their
 * lead/profile fields are merged. Used as the widget's bootstrap call.
 */
export const initSession = mutation({
  args: {
    publicKey: v.string(),
    token: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    orgId: v.string(),
    workspaceName: v.string(),
    visitorId: v.id("visitorSessions"),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspaceByPublicKey(ctx, args.publicKey);
    if (workspace === null) {
      throw new Error("Unknown workspace");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("visitorSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    let visitorId;
    if (existing === null) {
      visitorId = await ctx.db.insert("visitorSessions", {
        orgId: workspace.orgId,
        token: args.token,
        name: args.name,
        email: args.email,
        phone: args.phone,
        lastSeenAt: now,
      });
    } else {
      // Same token but a different workspace would be a tampered/stale token.
      if (existing.orgId !== workspace.orgId) {
        throw new Error("Invalid visitor session");
      }
      visitorId = existing._id;
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        name: args.name ?? existing.name,
        email: args.email ?? existing.email,
        phone: args.phone ?? existing.phone,
      });
    }

    // ===== PHASE 4: capture a lead when the widget passes contact details =====
    // The lead-capture form in the widget submits name/email here. We only
    // record a lead when we have at least a name or email; orgId is the
    // server-resolved workspace org (never a client value). De-duped per
    // visitor inside `recordLeadInternal`.
    if ((args.name && args.name.trim()) || (args.email && args.email.trim())) {
      await recordLead(ctx, {
        orgId: workspace.orgId,
        name: args.name ?? "",
        email: args.email ?? "",
        phone: args.phone,
        source: "widget",
        visitorId,
      });
    }
    // ===== END PHASE 4 =====

    return {
      orgId: workspace.orgId,
      workspaceName: workspace.name,
      visitorId,
      token: args.token,
    };
  },
});

// ===== PHASE 4: public widget config read + lead-capture helpers =====

/**
 * PUBLIC: resolve the widget appearance/behavior config for a workspace from
 * its public key. Returns the workspace defaults when unset. No visitor token
 * required — this is read before a session exists so the launcher/panel can be
 * themed and the lead-capture gate decided on first paint.
 */
export const getWidgetConfig = query({
  args: { publicKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      workspaceName: v.string(),
      config: widgetConfigValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const workspace = await resolveWorkspaceByPublicKey(ctx, args.publicKey);
    if (workspace === null) {
      return null;
    }
    const config = await resolveWidgetConfig(ctx, workspace.orgId);
    return { workspaceName: workspace.name, config };
  },
});

/**
 * PUBLIC: capture a lead submitted from the widget's lead form, linked to the
 * authorized visitor. orgId is resolved server-side from the publicKey; the
 * client never supplies it. Returns null (the lead id stays server-side).
 */
export const captureLead = mutation({
  args: {
    publicKey: v.string(),
    token: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspace, session } = await authorizeVisitor(
      ctx,
      args.publicKey,
      args.token,
    );

    const name = args.name.trim();
    const email = args.email.trim();
    if (name.length === 0 && email.length === 0) {
      throw new Error("Provide a name or email");
    }

    // Mirror the captured contact onto the visitor session too, so the inbox
    // shows the visitor's name/email immediately.
    await ctx.db.patch(session._id, {
      name: name || session.name,
      email: email || session.email,
      phone: args.phone?.trim() || session.phone,
      lastSeenAt: Date.now(),
    });

    await recordLead(ctx, {
      orgId: workspace.orgId,
      name,
      email,
      phone: args.phone,
      source: "widget",
      visitorId: session._id,
      conversationId: args.conversationId,
    });
    return null;
  },
});

/**
 * Record/update a lead within a widget mutation. Kept local to avoid a cross
 * runtime hop — de-duped per (org, visitor). orgId is the server-resolved
 * workspace org; this helper is only ever called with a trusted orgId.
 */
async function recordLead(
  ctx: MutationCtx,
  args: {
    orgId: string;
    name: string;
    email: string;
    phone?: string;
    source: string;
    visitorId?: Id<"visitorSessions">;
    conversationId?: Id<"conversations">;
  },
): Promise<void> {
  const name = args.name.trim();
  const email = args.email.trim();
  const phone = args.phone?.trim() || undefined;

  if (args.visitorId !== undefined) {
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(200);
    const match = existing.find((l) => l.visitorId === args.visitorId);
    if (match) {
      const nextName = name || match.name;
      const nextEmail = email || match.email;
      const nextPhone = phone ?? match.phone;
      await ctx.db.patch(match._id, {
        name: nextName,
        email: nextEmail,
        phone: nextPhone,
        conversationId: args.conversationId ?? match.conversationId,
        searchText: buildSearchText(nextName, nextEmail, nextPhone),
      });
      return;
    }
  }

  await ctx.db.insert("leads", {
    orgId: args.orgId,
    name,
    email,
    phone,
    status: "new",
    source: args.source,
    conversationId: args.conversationId,
    visitorId: args.visitorId,
    searchText: buildSearchText(name, email, phone),
  });
}
// ===== END PHASE 4 =====

/**
 * Find the visitor's current open conversation, or start a new one. Returns the
 * conversation id. A visitor has at most one active (open) conversation at a
 * time; if all prior ones are closed a fresh one is created.
 */
export const startConversation = mutation({
  args: {
    publicKey: v.string(),
    token: v.string(),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const { workspace, session } = await authorizeVisitor(
      ctx,
      args.publicKey,
      args.token,
    );

    // Reuse an existing OPEN conversation for this visitor if present.
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_visitor", (q) => q.eq("visitorId", session._id))
      .order("desc")
      .take(10);
    const open = existing.find((c) => c.status === "open");
    if (open) {
      return open._id;
    }

    const now = Date.now();
    return await ctx.db.insert("conversations", {
      orgId: workspace.orgId,
      status: "open",
      visitorId: session._id,
      lastMessageAt: now,
      unreadCount: 0,
    });
  },
});

/**
 * Send a message as the visitor. Re-opens a closed conversation, bumps
 * lastMessageAt, and increments the agent-facing unread counter.
 */
export const sendVisitorMessage = mutation({
  args: {
    publicKey: v.string(),
    token: v.string(),
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { workspace, session } = await authorizeVisitor(
      ctx,
      args.publicKey,
      args.token,
    );

    const conversation = await ctx.db.get(args.conversationId);
    if (
      conversation === null ||
      conversation.orgId !== workspace.orgId ||
      conversation.visitorId !== session._id
    ) {
      throw new Error("Conversation not found");
    }

    const body = args.body.trim();
    if (body.length === 0) {
      throw new Error("Message is empty");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      orgId: workspace.orgId,
      conversationId: args.conversationId,
      authorType: "visitor",
      body,
    });

    await ctx.db.patch(args.conversationId, {
      status: "open",
      lastMessageAt: now,
      unreadCount: conversation.unreadCount + 1,
    });
    await ctx.db.patch(session._id, { lastSeenAt: now });

    // Clear the visitor's typing row now that they've sent.
    const typingRow = await ctx.db
      .query("typing")
      .withIndex("by_conversation_and_who", (q) =>
        q.eq("conversationId", args.conversationId).eq("who", session.token),
      )
      .unique();
    if (typingRow) {
      await ctx.db.delete(typingRow._id);
    }

    return messageId;
  },
});

/**
 * Subscribed, paginated message list for one conversation, scoped to the
 * authorized visitor. Newest-first pages (the widget reverses for display).
 */
export const listMessages = query({
  args: {
    publicKey: v.string(),
    token: v.string(),
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(messageValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const { workspace, session } = await authorizeVisitor(
      ctx,
      args.publicKey,
      args.token,
    );
    const conversation = await ctx.db.get(args.conversationId);
    if (
      conversation === null ||
      conversation.orgId !== workspace.orgId ||
      conversation.visitorId !== session._id
    ) {
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

/**
 * Live agent presence + typing for the visitor's conversation. The widget shows
 * "Support is typing…" and an online dot. We expose only booleans (no agent
 * identity) to the public surface.
 */
export const agentActivity = query({
  args: {
    publicKey: v.string(),
    token: v.string(),
    conversationId: v.id("conversations"),
  },
  returns: v.object({
    agentOnline: v.boolean(),
    agentTyping: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { workspace, session } = await authorizeVisitor(
      ctx,
      args.publicKey,
      args.token,
    );
    const conversation = await ctx.db.get(args.conversationId);
    if (
      conversation === null ||
      conversation.orgId !== workspace.orgId ||
      conversation.visitorId !== session._id
    ) {
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

    const agentOnline = presenceRows.some(
      (r) => r.actorType === "agent" && now - r.lastActiveAt < PRESENCE_TTL_MS,
    );
    const agentTyping = typingRows.some(
      (r) => r.actorType === "agent" && now - r.lastActiveAt < TYPING_TTL_MS,
    );

    return { agentOnline, agentTyping };
  },
});

/** Heartbeat upsert: marks the visitor present (and optionally typing). */
export const heartbeat = mutation({
  args: {
    publicKey: v.string(),
    token: v.string(),
    conversationId: v.id("conversations"),
    typing: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspace, session } = await authorizeVisitor(
      ctx,
      args.publicKey,
      args.token,
    );
    const conversation = await ctx.db.get(args.conversationId);
    if (
      conversation === null ||
      conversation.orgId !== workspace.orgId ||
      conversation.visitorId !== session._id
    ) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();
    await upsertActivity(
      ctx,
      "presence",
      workspace.orgId,
      args.conversationId,
      session.token,
      "visitor",
      now,
    );
    if (args.typing) {
      await upsertActivity(
        ctx,
        "typing",
        workspace.orgId,
        args.conversationId,
        session.token,
        "visitor",
        now,
      );
    } else {
      const typingRow = await ctx.db
        .query("typing")
        .withIndex("by_conversation_and_who", (q) =>
          q.eq("conversationId", args.conversationId).eq("who", session.token),
        )
        .unique();
      if (typingRow) {
        await ctx.db.delete(typingRow._id);
      }
    }
    await ctx.db.patch(session._id, { lastSeenAt: now });
    return null;
  },
});

// Shared upsert for presence/typing rows. Kept local (not exported) — the
// agent-side mirror lives in convex/inbox.ts with its own copy to avoid a
// cross-file import cycle.
async function upsertActivity(
  ctx: MutationCtx,
  table: "presence" | "typing",
  orgId: string,
  conversationId: Id<"conversations">,
  who: string,
  actorType: "visitor" | "agent",
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
      actorType,
      lastActiveAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, { lastActiveAt: now, actorType });
  }
}
