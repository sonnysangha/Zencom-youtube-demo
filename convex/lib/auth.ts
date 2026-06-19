import type { UserIdentity } from "convex/server";
import type { QueryCtx } from "../_generated/server";
import { type OrgRole, normalizeRole } from "./roles";

/**
 * Authenticated identity from Clerk. Throws if there is no signed-in user.
 *
 * The returned object is the raw Convex `UserIdentity`. Clerk surfaces custom
 * claims (`org_id`, `org_role`, `org_slug`) directly on this object, but they
 * are not part of the typed `UserIdentity`, so callers read them via the
 * `getOrgContext` helper below (which casts through `any`).
 */
export async function getCurrentUser(ctx: QueryCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export type { OrgRole };

export interface OrgContext {
  orgId: string;
  userId: string;
  orgRole: OrgRole;
}

/**
 * Extract the active-organization context from a Clerk identity.
 *
 * Clerk's standard claims live at `org_id` / `org_role`. Some instances emit
 * compact v2 org claims under `o` (`o.id`, `o.rol`), so we read the standard
 * claim first and fall back to `o`. The role is narrowed via `normalizeRole`
 * (anything non-admin, including a missing role, becomes "org:member").
 *
 * `subject` is the Clerk user id and is used as `userId`.
 *
 * Throws "No active organization" when no org is active on the session.
 */
export function getOrgContext(identity: UserIdentity): OrgContext {
  const raw = identity as unknown as {
    org_id?: string;
    org_role?: string;
    o?: { id?: string; rol?: string };
  };

  const orgId = raw.org_id ?? raw.o?.id;
  if (!orgId) {
    throw new Error("No active organization");
  }

  const rawRole = raw.org_role ?? raw.o?.rol;
  const orgRole = normalizeRole(rawRole);

  return {
    orgId,
    userId: identity.subject,
    orgRole,
  };
}
