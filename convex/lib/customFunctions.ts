import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { mutation, query } from "../_generated/server";
import { getCurrentUser, getOrgContext } from "./auth";

/**
 * Shared, append-only auth wrappers. ALL authenticated tenant access goes
 * through these so that `orgId` / `userId` / `orgRole` are derived in exactly
 * one place (server-side, from the Clerk identity — never from client args).
 *
 * Each wrapper adds to `ctx`:
 *   - `ctx.orgId`   : the active Clerk org id ("org_xxx")
 *   - `ctx.userId`  : the Clerk user id (identity.subject)
 *   - `ctx.orgRole` : "org:admin" | "org:member"
 */

/** Authenticated, org-scoped query. */
export const orgQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const identity = await getCurrentUser(ctx);
    const { orgId, userId, orgRole } = getOrgContext(identity);
    return { orgId, userId, orgRole };
  }),
);

/** Authenticated, org-scoped mutation. */
export const orgMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const identity = await getCurrentUser(ctx);
    const { orgId, userId, orgRole } = getOrgContext(identity);
    return { orgId, userId, orgRole };
  }),
);

/**
 * Authenticated, org-scoped mutation that additionally requires the caller to
 * be an org admin. Throws "Forbidden: admin access required" otherwise.
 */
export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const identity = await getCurrentUser(ctx);
    const { orgId, userId, orgRole } = getOrgContext(identity);
    if (orgRole !== "org:admin") {
      throw new Error("Forbidden: admin access required");
    }
    return { orgId, userId, orgRole };
  }),
);

/**
 * Authenticated, org-scoped query that additionally requires the caller to be
 * an org admin. Used for admin-only config reads (e.g. the widget customizer).
 * Throws "Forbidden: admin access required" otherwise. (Added by Phase 4.)
 */
export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const identity = await getCurrentUser(ctx);
    const { orgId, userId, orgRole } = getOrgContext(identity);
    if (orgRole !== "org:admin") {
      throw new Error("Forbidden: admin access required");
    }
    return { orgId, userId, orgRole };
  }),
);
