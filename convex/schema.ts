import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// FOUNDATION (Phase 1)
// Tenancy model: a Clerk organization == a Zencom workspace.
// Every tenant table carries `orgId` (the Clerk org id, e.g. "org_xxx") and a
// `by_org` index so all tenant-scoped reads are bounded and indexed.
// Later tracks (tickets, conversations, billing, etc.) append their tables
// BELOW this delimited block.
// ============================================================================
export default defineSchema({
  // One row per Clerk organization. Created on first authenticated load via
  // `workspaces.ensureProvisioned`, and kept in sync by the Clerk webhook.
  workspaces: defineTable({
    orgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Public, embeddable identifier (e.g. for a widget). Generated once.
    publicKey: v.string(),
    settings: v.optional(v.any()),
  })
    .index("by_org", ["orgId"])
    .index("by_public_key", ["publicKey"]),

  // One row per (org, user) membership. Mirrors Clerk organization memberships.
  members: defineTable({
    orgId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("org:admin"), v.literal("org:member")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_user", ["orgId", "userId"])
    .index("by_user", ["userId"]),

  // --------------------------------------------------------------------------
  // END FOUNDATION (Phase 1) — later tracks append new tables below this line.
  // --------------------------------------------------------------------------

  // ===== PHASE 2: Real-time team inbox + embeddable widget =====
  // Human chat only (AI deferred to Phase 7). A visitor on an embedded widget
  // talks to an agent in the dashboard inbox. Tenancy: every row carries the
  // Clerk `orgId`. Public/widget traffic NEVER trusts a client orgId — it is
  // derived server-side from a workspace `publicKey` + a visitor session token.

  // One row per visitor↔workspace conversation.
  conversations: defineTable({
    orgId: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    // Clerk user id of the assigned agent, when assigned.
    assigneeId: v.optional(v.string()),
    // FK to the visitorSessions row that owns this conversation.
    visitorId: v.id("visitorSessions"),
    // Denormalized for inbox sorting without reading messages.
    lastMessageAt: v.number(),
    // Count of visitor messages the agents haven't "seen" yet (inbox badge).
    unreadCount: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_visitor", ["visitorId"]),

  // One row per chat message. `authorType` distinguishes visitor vs human agent
  // (AI author type is added in Phase 7).
  messages: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    authorType: v.union(v.literal("visitor"), v.literal("agent")),
    // Clerk user id for agent messages; null/undefined for visitor messages.
    authorId: v.optional(v.string()),
    body: v.string(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_org", ["orgId"]),

  // One row per anonymous widget visitor (keyed by a client-held token).
  visitorSessions: defineTable({
    orgId: v.string(),
    token: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    lastSeenAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_org", ["orgId"]),

  // High-churn presence pings. Separate table per the guidelines so frequent
  // writes don't contend with conversation/message reads. `who` is the actor id
  // (a Clerk user id for agents, the visitor token for visitors).
  presence: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    who: v.string(),
    actorType: v.union(v.literal("visitor"), v.literal("agent")),
    lastActiveAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_who", ["conversationId", "who"])
    .index("by_org", ["orgId"]),

  // High-churn typing indicators. Also separate from conversations for the same
  // contention reason. A row exists only while someone is actively typing.
  typing: defineTable({
    orgId: v.string(),
    conversationId: v.id("conversations"),
    who: v.string(),
    actorType: v.union(v.literal("visitor"), v.literal("agent")),
    lastActiveAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_who", ["conversationId", "who"])
    .index("by_org", ["orgId"]),
  // ===== END PHASE 2 =====

  // ===== PHASE 3: Knowledge base + RAG =====
  // Help-center articles (hand-authored markdown) and uploaded source documents
  // (.md/.txt/.pdf) that are chunked + embedded into the RAG component. The
  // chunks/embeddings themselves live inside the RAG component's own tables,
  // namespaced per `orgId`; these two tables only hold app-level metadata.
  articles: defineTable({
    orgId: v.string(),
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    markdown: v.string(),
    coverImage: v.optional(v.string()),
    popular: v.boolean(),
    published: v.boolean(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_slug", ["orgId", "slug"])
    .index("by_org_and_published", ["orgId", "published"]),

  // Uploaded source documents tracked through the ingestion pipeline. The raw
  // file lives in Convex file storage (`storageId`); `ragEntryId` links to the
  // RAG entry once embedding completes.
  documents: defineTable({
    orgId: v.string(),
    source: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error"),
    ),
    fileType: v.union(
      v.literal("md"),
      v.literal("txt"),
      v.literal("pdf"),
    ),
    storageId: v.optional(v.id("_storage")),
    ragEntryId: v.optional(v.string()),
    chunkCount: v.optional(v.number()),
    error: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
  }).index("by_org", ["orgId"]),
  // ===== END PHASE 3 =====

  // ===== PHASE 5: Billing & plans =====
  // Source of truth for plan/feature entitlements remains Clerk (`has({ plan })`
  // / `has({ feature })`). These tables are a *mirror* kept in sync by the Clerk
  // billing webhooks (convex/http.ts) so backend Convex functions can read the
  // active plan/status/seats without round-tripping to Clerk, and so usage can
  // be metered and quota-checked server-side.

  // One row per org: the latest known subscription state from Clerk billing.
  // Keyed by orgId. `plan` is the Clerk plan slug (e.g. "free_org", "pro",
  // "enterprise"); `status` is the Clerk subscription status (snake_case).
  subscriptions: defineTable({
    orgId: v.string(),
    // Clerk subscription id (evt.data.id on subscription events).
    subscriptionId: v.optional(v.string()),
    // Active plan slug. Defaults conceptually to "free_org" when unset.
    plan: v.string(),
    // Clerk status: active | past_due | canceled | ended | abandoned |
    // incomplete | expired | upcoming.
    status: v.string(),
    // Number of paid seats / members covered by the subscription, when known.
    seats: v.optional(v.number()),
    // When the current period ends (ms epoch), when known.
    currentPeriodEnd: v.optional(v.number()),
    // Last webhook event timestamp applied (ms epoch) for idempotency / ordering.
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  // Usage metering: one row per (org, metric, period). `period` is a coarse
  // bucket key (e.g. "2026-06" for a monthly quota, or "all" for lifetime
  // counters). Consuming tracks increment `count` via the helpers in
  // convex/lib/quota.ts as they record usage (AI messages, KB docs, etc.).
  usageMeters: defineTable({
    orgId: v.string(),
    metric: v.string(),
    period: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_metric_and_period", ["orgId", "metric", "period"]),
  // ===== END PHASE 5 =====
});
