import { v } from "convex/values";

/**
 * Phase 4 shared validators + helpers for leads.
 */

export const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("closed"),
);

// Precise document validator (incl. system fields) for a leads row, minus the
// internal `searchText` haystack which is never surfaced to clients.
export const leadValidator = v.object({
  _id: v.id("leads"),
  _creationTime: v.number(),
  orgId: v.string(),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  status: leadStatusValidator,
  source: v.string(),
  conversationId: v.optional(v.id("conversations")),
  visitorId: v.optional(v.id("visitorSessions")),
  notes: v.optional(v.string()),
});

/** Build the lowercase search haystack stored on each lead row. */
export function buildSearchText(
  name: string,
  email: string,
  phone?: string,
): string {
  return [name, email, phone ?? ""].join(" ").toLowerCase().trim();
}
