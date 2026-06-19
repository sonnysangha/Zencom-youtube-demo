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
