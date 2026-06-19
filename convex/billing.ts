import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
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
