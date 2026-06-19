import { v } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";

/**
 * Phase 3 — Public help center (unauthenticated reader/search at /help).
 *
 * PUBLIC access does NOT use the org wrappers. Tenancy is derived server-side
 * from a workspace `publicKey` (workspaces.by_public_key), and only PUBLISHED
 * articles are ever exposed. No `orgId` is ever accepted from the client.
 */

// Public-safe article shape: the raw markdown body is only returned for the
// single-article reader, not the list.
const articleSummaryValidator = v.object({
  _id: v.id("articles"),
  _creationTime: v.number(),
  title: v.string(),
  slug: v.string(),
  category: v.string(),
  coverImage: v.optional(v.string()),
  popular: v.boolean(),
});

const articleFullValidator = v.object({
  _id: v.id("articles"),
  _creationTime: v.number(),
  title: v.string(),
  slug: v.string(),
  category: v.string(),
  markdown: v.string(),
  coverImage: v.optional(v.string()),
  popular: v.boolean(),
});

async function resolveOrgId(
  ctx: QueryCtx,
  publicKey: string,
): Promise<string | null> {
  const workspace = await ctx.db
    .query("workspaces")
    .withIndex("by_public_key", (q) => q.eq("publicKey", publicKey))
    .unique();
  return workspace?.orgId ?? null;
}

/**
 * List published articles for a workspace, optionally filtered by a search
 * term (case-insensitive title/category match, applied in-memory over the
 * bounded published set).
 */
export const listPublished = query({
  args: {
    publicKey: v.string(),
    search: v.optional(v.string()),
  },
  returns: v.array(articleSummaryValidator),
  handler: async (ctx, args) => {
    const orgId = await resolveOrgId(ctx, args.publicKey);
    if (orgId === null) {
      return [];
    }

    const published = await ctx.db
      .query("articles")
      .withIndex("by_org_and_published", (q) =>
        q.eq("orgId", orgId).eq("published", true),
      )
      .order("desc")
      .take(500);

    const term = args.search?.trim().toLowerCase();
    const filtered =
      term && term.length > 0
        ? published.filter(
            (a) =>
              a.title.toLowerCase().includes(term) ||
              a.category.toLowerCase().includes(term),
          )
        : published;

    return filtered.map((a) => ({
      _id: a._id,
      _creationTime: a._creationTime,
      title: a.title,
      slug: a.slug,
      category: a.category,
      coverImage: a.coverImage,
      popular: a.popular,
    }));
  },
});

/** Fetch a single published article by slug for the public reader. */
export const getPublishedBySlug = query({
  args: {
    publicKey: v.string(),
    slug: v.string(),
  },
  returns: v.union(v.null(), articleFullValidator),
  handler: async (ctx, args) => {
    const orgId = await resolveOrgId(ctx, args.publicKey);
    if (orgId === null) {
      return null;
    }

    const article = await ctx.db
      .query("articles")
      .withIndex("by_org_and_slug", (q) =>
        q.eq("orgId", orgId).eq("slug", args.slug),
      )
      .unique();

    if (article === null || !article.published) {
      return null;
    }

    return {
      _id: article._id,
      _creationTime: article._creationTime,
      title: article.title,
      slug: article.slug,
      category: article.category,
      markdown: article.markdown,
      coverImage: article.coverImage,
      popular: article.popular,
    };
  },
});

/**
 * Resolve a workspace's display name from its publicKey, for the help-center
 * header. Returns null if the key is unknown.
 */
export const workspaceInfo = query({
  args: { publicKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({ name: v.string(), imageUrl: v.optional(v.string()) }),
  ),
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_public_key", (q) => q.eq("publicKey", args.publicKey))
      .unique();
    if (workspace === null) {
      return null;
    }
    return { name: workspace.name, imageUrl: workspace.imageUrl };
  },
});
