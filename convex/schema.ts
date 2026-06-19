import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// FOUNDATION (Phase 1)
// Tenancy model: a Clerk organization == a Zencom workspace.
// Every tenant table carries `orgId` (the Clerk org id, e.g. "org_xxx") and a
// `by_org` index so all tenant-scoped reads are bounded and indexed.
// Later tracks (tickets, conversations, billing, etc.) append their tables
// BELOW this delimited block.
// ============================================================================
export default defineSchema({
  // One row per Clerk organization. Created on first authenticated load via
  // `workspaces.ensureProvisioned`, and kept in sync by the Clerk webhook.
  workspaces: defineTable({
    orgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Public, embeddable identifier (e.g. for a widget). Generated once.
    publicKey: v.string(),
    settings: v.optional(v.any()),
  })
    .index("by_org", ["orgId"])
    .index("by_public_key", ["publicKey"]),

  // One row per (org, user) membership. Mirrors Clerk organization memberships.
  members: defineTable({
    orgId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("org:admin"), v.literal("org:member")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_user", ["orgId", "userId"])
    .index("by_user", ["userId"]),

  // --------------------------------------------------------------------------
  // END FOUNDATION (Phase 1) — later tracks append new tables below this line.
  // --------------------------------------------------------------------------

  // ===== PHASE 3: Knowledge base + RAG =====
  // Help-center articles (hand-authored markdown) and uploaded source documents
  // (.md/.txt/.pdf) that are chunked + embedded into the RAG component. The
  // chunks/embeddings themselves live inside the RAG component's own tables,
  // namespaced per `orgId`; these two tables only hold app-level metadata.
  articles: defineTable({
    orgId: v.string(),
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    markdown: v.string(),
    coverImage: v.optional(v.string()),
    popular: v.boolean(),
    published: v.boolean(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_slug", ["orgId", "slug"])
    .index("by_org_and_published", ["orgId", "published"]),

  // Uploaded source documents tracked through the ingestion pipeline. The raw
  // file lives in Convex file storage (`storageId`); `ragEntryId` links to the
  // RAG entry once embedding completes.
  documents: defineTable({
    orgId: v.string(),
    source: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error"),
    ),
    fileType: v.union(
      v.literal("md"),
      v.literal("txt"),
      v.literal("pdf"),
    ),
    storageId: v.optional(v.id("_storage")),
    ragEntryId: v.optional(v.string()),
    chunkCount: v.optional(v.number()),
    error: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
  }).index("by_org", ["orgId"]),
  // ===== END PHASE 3 =====
});
