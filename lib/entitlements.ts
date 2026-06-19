import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * PHASE 5 — Reusable server-side entitlement helpers.
 *
 * These wrap Clerk's `has({ plan })` / `has({ feature })` (the source of truth
 * for what an org has paid for) so OTHER tracks can gate routes, server
 * components, and server actions with a single import instead of re-deriving the
 * `auth()` + `has()` dance everywhere.
 *
 * All checks evaluate the *active organization* (this is a B2B-only app, plans
 * are org-level). Each helper returns `false` when there is no active org.
 *
 * Plan slugs (defined in Clerk Billing → Organization Plans):
 *   - "free_org"   — Free
 *   - "pro"        — Pro
 *   - "enterprise" — Enterprise
 *
 * Feature slugs (attached to plans in Clerk Billing):
 *   shared_inbox, knowledge_base, ai_agent, lead_capture,
 *   widget_customization, analytics, priority_support, sso, audit_logs
 *
 * Client components should use Clerk's `useAuth().has(...)` directly (and/or the
 * shared slug constants below) — `auth()` is server-only.
 */

// ---------------------------------------------------------------------------
// Slug catalogs (single source for both server and client call sites)
// ---------------------------------------------------------------------------

export const PLANS = {
  free: "free_org",
  pro: "pro",
  enterprise: "enterprise",
} as const;

export type PlanSlug = (typeof PLANS)[keyof typeof PLANS];

export const FEATURES = {
  sharedInbox: "shared_inbox",
  knowledgeBase: "knowledge_base",
  aiAgent: "ai_agent",
  leadCapture: "lead_capture",
  widgetCustomization: "widget_customization",
  analytics: "analytics",
  prioritySupport: "priority_support",
  sso: "sso",
  auditLogs: "audit_logs",
} as const;

export type FeatureSlug = (typeof FEATURES)[keyof typeof FEATURES];

// ---------------------------------------------------------------------------
// Server helpers
// ---------------------------------------------------------------------------

/** True if the active org's plan includes the given feature. */
export async function hasFeature(feature: FeatureSlug): Promise<boolean> {
  const { orgId, has } = await auth();
  if (!orgId) return false;
  return has({ feature });
}

/** True if the active org is subscribed to the given plan tier. */
export async function hasPlan(plan: PlanSlug): Promise<boolean> {
  const { orgId, has } = await auth();
  if (!orgId) return false;
  return has({ plan });
}

/**
 * Resolve the active org's plan tier as a slug. Returns "free_org" as the
 * baseline when no paid plan is active (or no active org).
 */
export async function getActivePlan(): Promise<PlanSlug> {
  const { orgId, has } = await auth();
  if (!orgId) return PLANS.free;
  if (has({ plan: PLANS.enterprise })) return PLANS.enterprise;
  if (has({ plan: PLANS.pro })) return PLANS.pro;
  return PLANS.free;
}

/**
 * Guard a server component / route: throws unless the active org has `feature`.
 * Callers catch this to `redirect("/dashboard/billing")` or render an upsell.
 *
 * @throws {EntitlementError} when the feature is not entitled.
 */
export async function requireFeature(feature: FeatureSlug): Promise<void> {
  if (!(await hasFeature(feature))) {
    throw new EntitlementError(`Feature "${feature}" is not included in your plan.`);
  }
}

/**
 * Guard a server component / route: throws unless the active org is on `plan`.
 *
 * @throws {EntitlementError} when the plan is not active.
 */
export async function requirePlan(plan: PlanSlug): Promise<void> {
  if (!(await hasPlan(plan))) {
    throw new EntitlementError(`This area requires the "${plan}" plan.`);
  }
}

/** Thrown by `requireFeature` / `requirePlan` when an entitlement is missing. */
export class EntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}
