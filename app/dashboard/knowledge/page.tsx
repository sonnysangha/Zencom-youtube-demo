import { auth } from "@clerk/nextjs/server";
import { ShieldAlert } from "lucide-react";

import { KnowledgeManager } from "@/components/knowledge/knowledge-manager";

/**
 * Phase 3 — Knowledge base dashboard (admin-gated).
 *
 * Article CRUD + document ingestion. Writes are additionally enforced
 * server-side in Convex via `adminMutation`, so this page-level gate is the
 * first line of defense, not the only one.
 */
export default async function KnowledgePage() {
  const { has } = await auth();

  if (!has({ role: "org:admin" })) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">
          The knowledge base is restricted to workspace admins. Ask an admin to
          update your role if you need access.
        </p>
      </div>
    );
  }

  return <KnowledgeManager />;
}
