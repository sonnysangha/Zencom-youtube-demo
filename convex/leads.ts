import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { orgMutation, orgQuery } from "./lib/customFunctions";
import {
  buildSearchText,
  leadStatusValidator,
  leadValidator,
} from "./lib/leads";

/**
 * Phase 4 — AUTHED lead management API (depends on Phase 2 widget/visitors).
 *
 * Everything here goes through orgQuery / orgMutation, so `ctx.orgId` is derived
 * from the Clerk JWT and every read is index-bounded to the caller's org. The
 * PUBLIC lead-capture path (widget → leads) lives in convex/widget.ts and
 * resolves orgId server-side from the workspace publicKey.
 */

const sortValidator = v.union(
  v.literal("newest"),
  v.literal("oldest"),
  v.literal("name"),
);

/**
 * Paginated, filterable, searchable leads list.
 *
 * - `search` (non-empty) uses the `search_contact` full-text index, scoped to
 *   the org (and optional status) via filter fields.
 * - Otherwise reads via `by_org_and_status` (when a status is given) or
 *   `by_org`, ordered by recency / name on the bounded page.
 */
export const listLeads = orgQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(leadStatusValidator),
    source: v.optional(v.string()),
    search: v.optional(v.string()),
    sort: v.optional(sortValidator),
  },
  returns: v.object({
    page: v.array(leadValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const search = args.search?.trim();
    const sort = args.sort ?? "newest";

    let result;
    if (search && search.length > 0) {
      // Full-text search path (relevance-ordered; sort arg is ignored here).
      result = await ctx.db
        .query("leads")
        .withSearchIndex("search_contact", (q) => {
          const base = q
            .search("searchText", search.toLowerCase())
            .eq("orgId", ctx.orgId);
          return args.status !== undefined
            ? base.eq("status", args.status)
            : base;
        })
        .paginate(args.paginationOpts);
    } else if (args.status !== undefined) {
      result = await ctx.db
        .query("leads")
        .withIndex("by_org_and_status", (q) =>
          q.eq("orgId", ctx.orgId).eq("status", args.status!),
        )
        .order(sort === "oldest" ? "asc" : "desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query("leads")
        .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
        .order(sort === "oldest" ? "asc" : "desc")
        .paginate(args.paginationOpts);
    }

    // Optional source filter applied on the bounded page.
    let page = result.page;
    if (args.source !== undefined && args.source.length > 0) {
      page = page.filter((l) => l.source === args.source);
    }
    // Name sort is applied on the bounded page (search/recency indexes can't
    // order by name directly).
    if (sort === "name") {
      page = [...page].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    }

    return {
      page: page.map(stripLead),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Distinct lead sources + status counts for the filter UI. Bounded scan over a
 * recent window of the org's leads (sufficient for the filter chips).
 */
export const leadStats = orgQuery({
  args: {},
  returns: v.object({
    total: v.number(),
    new: v.number(),
    contacted: v.number(),
    closed: v.number(),
    sources: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("leads")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .order("desc")
      .take(1000);
    const sources = new Set<string>();
    let nw = 0;
    let contacted = 0;
    let closed = 0;
    for (const r of rows) {
      sources.add(r.source);
      if (r.status === "new") nw += 1;
      else if (r.status === "contacted") contacted += 1;
      else if (r.status === "closed") closed += 1;
    }
    return {
      total: rows.length,
      new: nw,
      contacted,
      closed,
      sources: [...sources].sort(),
    };
  },
});

/**
 * Export the org's leads (bounded) for CSV download. Returns plain rows; the
 * client serializes to CSV. Capped at 5000 to stay within read limits.
 */
export const exportLeads = orgQuery({
  args: {
    status: v.optional(leadStatusValidator),
  },
  returns: v.array(leadValidator),
  handler: async (ctx, args) => {
    const rows =
      args.status !== undefined
        ? await ctx.db
            .query("leads")
            .withIndex("by_org_and_status", (q) =>
              q.eq("orgId", ctx.orgId).eq("status", args.status!),
            )
            .order("desc")
            .take(5000)
        : await ctx.db
            .query("leads")
            .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
            .order("desc")
            .take(5000);
    return rows.map(stripLead);
  },
});

/** Inline status update for a single lead (org-scoped). */
export const updateLeadStatus = orgMutation({
  args: {
    leadId: v.id("leads"),
    status: leadStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null || lead.orgId !== ctx.orgId) {
      throw new Error("Lead not found");
    }
    await ctx.db.patch(args.leadId, { status: args.status });
    return null;
  },
});

/** Update a lead's notes (org-scoped). */
export const updateLeadNotes = orgMutation({
  args: {
    leadId: v.id("leads"),
    notes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null || lead.orgId !== ctx.orgId) {
      throw new Error("Lead not found");
    }
    await ctx.db.patch(args.leadId, { notes: args.notes });
    return null;
  },
});

/** Manually add a lead from the dashboard. */
export const createLead = orgMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim();
    if (name.length === 0 || email.length === 0) {
      throw new Error("Name and email are required");
    }
    return await ctx.db.insert("leads", {
      orgId: ctx.orgId,
      name,
      email,
      phone: args.phone?.trim() || undefined,
      status: "new",
      source: "manual",
      notes: args.notes?.trim() || undefined,
      searchText: buildSearchText(name, email, args.phone),
    });
  },
});

/** Delete a lead (org-scoped). */
export const deleteLead = orgMutation({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (lead === null || lead.orgId !== ctx.orgId) {
      throw new Error("Lead not found");
    }
    await ctx.db.delete(args.leadId);
    return null;
  },
});

// Drop the internal `searchText` field from a row before returning to clients.
function stripLead(row: {
  _id: import("./_generated/dataModel").Id<"leads">;
  _creationTime: number;
  orgId: string;
  name: string;
  email: string;
  phone?: string;
  status: "new" | "contacted" | "closed";
  source: string;
  conversationId?: import("./_generated/dataModel").Id<"conversations">;
  visitorId?: import("./_generated/dataModel").Id<"visitorSessions">;
  notes?: string;
  searchText: string;
}) {
  return {
    _id: row._id,
    _creationTime: row._creationTime,
    orgId: row.orgId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    source: row.source,
    conversationId: row.conversationId,
    visitorId: row.visitorId,
    notes: row.notes,
  };
}
