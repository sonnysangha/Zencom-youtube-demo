import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Phase 2 shared helpers + validators for the inbox/widget backend.
 *
 * Tenancy split:
 *  - Authed agent functions go through orgQuery/orgMutation (ctx.orgId is from
 *    the Clerk JWT). They never accept an orgId argument.
 *  - Public/widget functions accept a workspace `publicKey` + a visitor session
 *    `token`. They resolve orgId SERVER-SIDE from the publicKey (never trust a
 *    client-supplied orgId) and authenticate the visitor by token.
 */

// How long after a heartbeat we still consider an actor "present"/"typing".
export const PRESENCE_TTL_MS = 15_000;
export const TYPING_TTL_MS = 6_000;

export const statusValidator = v.union(v.literal("open"), v.literal("closed"));
// PHASE 7 extends authorType with "ai" (AI-generated answers). Additive: the
// Phase 2 visitor/agent reads continue to validate unchanged.
export const authorTypeValidator = v.union(
  v.literal("visitor"),
  v.literal("agent"),
  v.literal("ai"),
);

// ===== PHASE 7: RAG citation shape carried on AI answer messages. =====
export const sourceValidator = v.object({
  entryId: v.string(),
  title: v.optional(v.string()),
  score: v.number(),
});
// ===== END PHASE 7 =====

// Precise document validators (incl. system fields) reused across functions.
export const conversationValidator = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  orgId: v.string(),
  status: statusValidator,
  assigneeId: v.optional(v.string()),
  visitorId: v.id("visitorSessions"),
  lastMessageAt: v.number(),
  unreadCount: v.number(),
});

export const messageValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  orgId: v.string(),
  conversationId: v.id("conversations"),
  authorType: authorTypeValidator,
  authorId: v.optional(v.string()),
  body: v.string(),
  // ===== PHASE 7: optional citations on AI answers. =====
  sources: v.optional(v.array(sourceValidator)),
  // ===== END PHASE 7 =====
});

export const visitorSessionValidator = v.object({
  _id: v.id("visitorSessions"),
  _creationTime: v.number(),
  orgId: v.string(),
  token: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  lastSeenAt: v.number(),
});

// Enriched conversation row for the inbox list (joins visitor + last message).
export const inboxConversationValidator = v.object({
  _id: v.id("conversations"),
  _creationTime: v.number(),
  orgId: v.string(),
  status: statusValidator,
  assigneeId: v.optional(v.string()),
  visitorId: v.id("visitorSessions"),
  lastMessageAt: v.number(),
  unreadCount: v.number(),
  visitorName: v.optional(v.string()),
  visitorEmail: v.optional(v.string()),
  lastMessagePreview: v.optional(v.string()),
  lastMessageAuthorType: v.optional(authorTypeValidator),
});

export type InboxConversation = {
  _id: Doc<"conversations">["_id"];
  _creationTime: number;
  orgId: string;
  status: "open" | "closed";
  assigneeId?: string;
  visitorId: Doc<"conversations">["visitorId"];
  lastMessageAt: number;
  unreadCount: number;
  visitorName?: string;
  visitorEmail?: string;
  lastMessagePreview?: string;
  // PHASE 7: "ai" added to author types.
  lastMessageAuthorType?: "visitor" | "agent" | "ai";
};

/**
 * Resolve a workspace by its public, embeddable key. Returns the workspace doc
 * or null. orgId is read off the returned doc — callers must NEVER accept an
 * orgId from the client.
 */
export async function resolveWorkspaceByPublicKey(
  ctx: QueryCtx,
  publicKey: string,
): Promise<Doc<"workspaces"> | null> {
  return await ctx.db
    .query("workspaces")
    .withIndex("by_public_key", (q) => q.eq("publicKey", publicKey))
    .unique();
}

/**
 * Resolve + authorize a visitor for a given workspace. The visitor is trusted
 * only when (a) the publicKey maps to a workspace and (b) the token maps to a
 * visitorSession whose orgId matches that workspace. Returns both docs, or
 * throws on any mismatch.
 */
export async function authorizeVisitor(
  ctx: QueryCtx,
  publicKey: string,
  token: string,
): Promise<{ workspace: Doc<"workspaces">; session: Doc<"visitorSessions"> }> {
  const workspace = await resolveWorkspaceByPublicKey(ctx, publicKey);
  if (workspace === null) {
    throw new Error("Unknown workspace");
  }
  const session = await ctx.db
    .query("visitorSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (session === null || session.orgId !== workspace.orgId) {
    throw new Error("Invalid visitor session");
  }
  return { workspace, session };
}

/** Trim a message body to a short single-line preview for inbox lists. */
export function preview(body: string, max = 120): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
