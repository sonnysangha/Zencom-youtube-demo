import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { orgQuery } from "./lib/customFunctions";

const roleValidator = v.union(v.literal("org:admin"), v.literal("org:member"));

/** Precise return validator for a `members` document, with system fields. */
const memberValidator = v.object({
  _id: v.id("members"),
  _creationTime: v.number(),
  orgId: v.string(),
  userId: v.string(),
  role: roleValidator,
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
});

/**
 * List the members of the caller's active org. Bounded with `.take(200)` so it
 * stays within transaction limits as the org grows.
 */
export const list = orgQuery({
  args: {},
  returns: v.array(memberValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("members")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .take(200);
  },
});

/**
 * Webhook-driven upsert
 * (organizationMembership.created / organizationMembership.updated).
 */
export const upsertFromClerk = internalMutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    role: roleValidator,
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("members")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", args.userId),
      )
      .unique();

    if (existing === null) {
      await ctx.db.insert("members", {
        orgId: args.orgId,
        userId: args.userId,
        role: args.role,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
    } else {
      await ctx.db.patch(existing._id, {
        role: args.role,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
    }
    return null;
  },
});

/**
 * Webhook-driven delete (organizationMembership.deleted).
 */
export const removeFromClerk = internalMutation({
  args: { orgId: v.string(), userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("members")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", args.userId),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
