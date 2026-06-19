import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { orgMutation, orgQuery } from "./lib/customFunctions";

/**
 * Precise return validator for a `workspaces` document, including the two
 * system fields Convex adds automatically. Kept here so both `ensureProvisioned`
 * and `current` reuse the exact same shape.
 */
const workspaceValidator = v.object({
  _id: v.id("workspaces"),
  _creationTime: v.number(),
  orgId: v.string(),
  name: v.string(),
  slug: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  publicKey: v.string(),
  settings: v.optional(v.any()),
});

function newPublicKey(): string {
  return `pk_${crypto.randomUUID()}`;
}

/**
 * Idempotent first-load provisioning. Called by the client right after an org
 * becomes active. The display data in `args` (name/slug/imageUrl) is taken from
 * the client's active Clerk org for convenience only — it is NOT used for
 * authorization. Tenancy (orgId), the caller's identity (userId) and role
 * (orgRole) all come from `ctx` (derived server-side from the Clerk JWT).
 *
 * Behavior:
 *   1. Look up the workspace for ctx.orgId; create it (with a generated
 *      publicKey) if it does not exist yet.
 *   2. Upsert the calling user's membership row with role = ctx.orgRole.
 *   3. Return the (existing or freshly created) workspace document.
 */
export const ensureProvisioned = orgMutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: workspaceValidator,
  handler: async (ctx, args) => {
    // 1. Workspace.
    let workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .unique();

    if (workspace === null) {
      const workspaceId = await ctx.db.insert("workspaces", {
        orgId: ctx.orgId,
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        publicKey: newPublicKey(),
      });
      workspace = await ctx.db.get(workspaceId);
    }

    // 2. Membership for the calling user.
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", ctx.orgId).eq("userId", ctx.userId),
      )
      .unique();

    if (existingMember === null) {
      await ctx.db.insert("members", {
        orgId: ctx.orgId,
        userId: ctx.userId,
        role: ctx.orgRole,
      });
    } else if (existingMember.role !== ctx.orgRole) {
      await ctx.db.patch(existingMember._id, { role: ctx.orgRole });
    }

    // `workspace` is non-null here: it was either found or just inserted+read.
    return workspace!;
  },
});

/**
 * Return the workspace for the caller's active org, or null if not provisioned.
 */
export const current = orgQuery({
  args: {},
  returns: v.union(v.null(), workspaceValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("workspaces")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .unique();
  },
});

/**
 * Webhook-driven upsert (organization.created / organization.updated).
 * Patches an existing workspace's display fields, or inserts a new one with a
 * freshly generated publicKey.
 */
export const upsertFromClerk = internalMutation({
  args: {
    orgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();

    if (existing === null) {
      await ctx.db.insert("workspaces", {
        orgId: args.orgId,
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        publicKey: newPublicKey(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
      });
    }
    return null;
  },
});

/**
 * Webhook-driven delete (organization.deleted). Deletes the workspace row for
 * the org if present. Member cleanup is handled separately in members.ts.
 */
export const deleteFromClerk = internalMutation({
  args: { orgId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .unique();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
