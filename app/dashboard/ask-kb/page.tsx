import { AskKb } from "@/components/knowledge/ask-kb";

/**
 * Phase 3 — Standalone "Ask KB" test surface. Available to every workspace
 * member; RAG retrieval and the thread are scoped to the active workspace.
 */
export default function AskKbPage() {
  return <AskKb />;
}
