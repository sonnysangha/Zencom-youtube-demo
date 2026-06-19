import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { orgMutation, orgQuery } from "./lib/customFunctions";

/**
 * PHASE 5 — Billing: the Convex-side subscription mirror + usage metering.
 *
 * Entitlement source of truth is Clerk. These functions maintain a *mirror* of
 * the org's subscription (synced by the Clerk billing webhooks in
 * convex/http.ts) plus per-period usage counters, so backend Convex functions
 * can read plan/status/seats and enforce quotas without calling Clerk.
 */

const subscriptionValidator = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  orgId: v.string(),
  subscriptionId: v.optional(v.string()),
  plan: v.string(),
  status: v.string(),
  seats: v.optional(v.number()),
  currentPeriodEnd: v.optional(v.number()),
  updatedAt: v.number(),
});

const usageMeterValidator = v.object({
  _id: v.id("usageMeters"),
  _creationTime: v.number(),
  orgId: v.string(),
  metric: v.string(),
  period: v.string(),
  count: v.number(),
  updatedAt: v.number(),
});

// ---------------------------------------------------------------------------
// Subscription mirror — reads
// ---------------------------------------------------------------------------

/**
 * The caller's active-org subscription mirror, or null if none has synced yet
 * (treat null as the implicit "free_org" plan).
 */
export const currentSubscription = orgQuery({
  args: {},
  returns: v.union(v.null(), subscriptionValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .unique();
  },
});

// ---------------------------------------------------------------------------
// Subscription mirror — webhook-driven writes (internal only)
// ---------------------------------------------------------------------------

/**
 * Upsert the subscription mirror for an org from a Clerk billing webhook.
 * Idempotent: webhook replays / out-of-order events are tolerated by only
 * applying when the event is at least as new as what we already stored.
 */
export const upsertSubscriptionFromClerk = internalMutation({
  args: {
    orgId: v.string(),
    subscriptionId: v.optional(v.string()),
    plan: v.string(),
    status: v.string(),
    seats: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    eventAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();

    if (existing === null) {
      await ctx.db.insert("subscriptions", {
        orgId: args.orgId,
        subscriptionId: args.subscriptionId,
        plan: args.plan,
        status: args.status,
        seats: args.seats,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: args.eventAt,
      });
      return null;
    }

    // Ignore stale events (older than what we've already applied).
    if (args.eventAt < existing.updatedAt) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      subscriptionId: args.subscriptionId ?? existing.subscriptionId,
      plan: args.plan,
      status: args.status,
      seats: args.seats ?? existing.seats,
      currentPeriodEnd: args.currentPeriodEnd ?? existing.currentPeriodEnd,
      updatedAt: args.eventAt,
    });
    return null;
  },
});

/**
 * Patch only the status of an org's subscription mirror (e.g. past_due /
 * canceled item events where we don't get the full subscription payload).
 * No-op if the org has no mirror row yet.
 */
export const updateSubscriptionStatusFromClerk = internalMutation({
  args: {
    orgId: v.string(),
    status: v.string(),
    eventAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
    if (existing === null) {
      return null;
    }
    if (args.eventAt < existing.updatedAt) {
      return null;
    }
    await ctx.db.patch(existing._id, {
      status: args.status,
      updatedAt: args.eventAt,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Usage metering — durable per-period quota counters
// ---------------------------------------------------------------------------

/**
 * Read the caller-org usage for a metric in a period. Returns 0 when no row
 * exists yet. Other tracks use this to render quota progress.
 */
export const usageForMetric = orgQuery({
  args: { metric: v.string(), period: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("usageMeters")
      .withIndex("by_org_and_metric_and_period", (q) =>
        q
          .eq("orgId", ctx.orgId)
          .eq("metric", args.metric)
          .eq("period", args.period),
      )
      .unique();
    return row?.count ?? 0;
  },
});

/**
 * All usage meters for the caller's org (bounded). For the billing dashboard.
 */
export const usageForOrg = orgQuery({
  args: {},
  returns: v.array(usageMeterValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("usageMeters")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .take(200);
  },
});

/**
 * Increment a usage meter for the caller's org by `amount` (default 1) and
 * return the new total. Creates the (org, metric, period) row on first use.
 *
 * Other tracks import this via `internal.billing.incrementUsage` from their own
 * mutations (e.g. after recording an AI reply) — or call it directly when the
 * caller is already org-scoped. Exposed as an `orgMutation` so the orgId is
 * always derived server-side, never trusted from the client.
 */
export const incrementUsage = orgMutation({
  args: {
    metric: v.string(),
    period: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const amount = args.amount ?? 1;
    const existing = await ctx.db
      .query("usageMeters")
      .withIndex("by_org_and_metric_and_period", (q) =>
        q
          .eq("orgId", ctx.orgId)
          .eq("metric", args.metric)
          .eq("period", args.period),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("usageMeters", {
        orgId: ctx.orgId,
        metric: args.metric,
        period: args.period,
        count: amount,
        updatedAt: Date.now(),
      });
      return amount;
    }

    const next = existing.count + amount;
    await ctx.db.patch(existing._id, { count: next, updatedAt: Date.now() });
    return next;
  },
});

// ---------------------------------------------------------------------------
// Internal helpers for server-side quota enforcement (convex/lib/quota.ts).
//
// Actions (widgetAi, askKb, ingest) cannot touch ctx.db, so they read the
// subscription mirror / usage meters and bump counters through these internal
// functions via ctx.runQuery / ctx.runMutation. The orgId is always passed in
// already server-derived (from the Clerk JWT or a workspace publicKey), never
// trusted from a client.
// ---------------------------------------------------------------------------

/**
 * The active plan slug for an org from the Convex subscription mirror, or null
 * when no subscription has synced yet (callers treat null as the Free plan).
 *
 * A subscription is only treated as conferring its paid plan while its status
 * is healthy ("active" / "trialing"). Lapsed states (past_due, canceled,
 * ended, etc.) fall back to Free so quota enforcement tightens automatically
 * when billing lapses — matching the Clerk `has({ plan })` source of truth.
 */
export const planForOrg = internalQuery({
  args: { orgId: v.string() },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
    if (sub === null) {
      return null;
    }
    const healthy = sub.status === "active" || sub.status === "trialing";
    return healthy ? sub.plan : null;
  },
});

/**
 * Read a usage meter count for an org/metric/period (0 when absent). Mirrors
 * `usageForMetric` but as an internal query callable from actions with a
 * server-derived orgId.
 */
export const usageForOrgMetricPeriod = internalQuery({
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
 * Increment a usage meter for a server-derived org by `amount` (default 1) and
 * return the new total. Creates the (org, metric, period) row on first use.
 * Internal sibling of `incrementUsage` (the orgMutation) for action call sites.
 */
export const incrementUsageInternal = internalMutation({
  args: {
    orgId: v.string(),
    metric: v.string(),
    period: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const amount = args.amount ?? 1;
    const existing = await ctx.db
      .query("usageMeters")
      .withIndex("by_org_and_metric_and_period", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("metric", args.metric)
          .eq("period", args.period),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("usageMeters", {
        orgId: args.orgId,
        metric: args.metric,
        period: args.period,
        count: amount,
        updatedAt: Date.now(),
      });
      return amount;
    }

    const next = existing.count + amount;
    await ctx.db.patch(existing._id, { count: next, updatedAt: Date.now() });
    return next;
  },
});

/**
 * Count non-errored `documents` rows for an org, bounded by `limit` (we read at
 * most `limit + 1` rows so the caller can detect "at or over the cap" without
 * an unbounded scan). Used to enforce the per-plan KB-documents quota before
 * ingesting a new document. Documents in the "error" state never embedded, so
 * they don't count against the quota.
 */
export const countDocumentsForOrg = internalQuery({
  args: { orgId: v.string(), limit: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("documents")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .take(args.limit + 1);
    return rows.filter((r) => r.status !== "error").length;
  },
});
