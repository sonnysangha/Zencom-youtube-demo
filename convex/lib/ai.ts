import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { RAG } from "@convex-dev/rag";
import { components } from "../_generated/api";

/**
 * Shared AI provider configuration for Phase 3 (Knowledge base + RAG).
 *
 * Provider: OpenAI. `gpt-4o-mini` for generation, `text-embedding-3-small`
 * (1536 dimensions) for embeddings. `OPENAI_API_KEY` is read from the Convex
 * deployment environment by the `@ai-sdk/openai` provider.
 *
 * Neither the RAG nor the Agent component touch Node-only modules, so this file
 * stays in the default Convex (V8) runtime and can be imported anywhere.
 */

// Embedding model used for both RAG chunk embeddings and Agent message search.
export const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");
export const EMBEDDING_DIMENSION = 1536;

// Chat model used for the "Ask KB" answer generation.
export const CHAT_MODEL = openai.chat("gpt-4o-mini");

/**
 * RAG instance. Content is organized into one namespace per `orgId` so a
 * workspace can only ever retrieve its own chunks — tenant isolation is
 * enforced by the namespace string, which is always derived server-side.
 */
export const rag = new RAG(components.rag, {
  textEmbeddingModel: EMBEDDING_MODEL,
  embeddingDimension: EMBEDDING_DIMENSION,
});

/**
 * Agent used for the standalone "Ask KB" surface. It owns thread + message
 * persistence and delta streaming. RAG context is injected into the prompt at
 * call time (see `convex/askKb.ts`); we do not rely on the Agent's own message
 * vector search for the knowledge base.
 */
export const kbAgent = new Agent(components.agent, {
  name: "Knowledge base assistant",
  languageModel: CHAT_MODEL,
  textEmbeddingModel: EMBEDDING_MODEL,
  instructions:
    "You are a helpful support assistant for this workspace. Answer the user's " +
    "question using ONLY the provided knowledge base context. If the context " +
    "does not contain the answer, say you don't have that information in the " +
    "knowledge base and suggest contacting support. Be concise and cite the " +
    "source titles you used inline like [Source: <title>].",
});

// ===== PHASE 7: Widget AI integration =====
/**
 * Agent powering the embedded support widget. Same OpenAI provider + RAG
 * grounding as the Ask-KB agent, but with visitor-facing instructions (warm
 * tone, no internal jargon). Per-conversation threads are owned by
 * `userId = orgId` (server-derived from the workspace publicKey) so streaming
 * and history stay tenant-isolated. RAG context is injected per call from the
 * workspace's namespace (see convex/widgetAi.ts); we do not rely on the Agent's
 * own message vector search for grounding.
 */
export const widgetAgent = new Agent(components.agent, {
  name: "Support widget assistant",
  languageModel: CHAT_MODEL,
  textEmbeddingModel: EMBEDDING_MODEL,
  instructions:
    "You are a friendly customer-support assistant chatting with a website " +
    "visitor. Answer using ONLY the provided knowledge base context. Keep " +
    "answers short, warm, and conversational. If the context does not contain " +
    "the answer, say you're not sure and offer to connect them with the support " +
    "team. Never invent details. When you use a source, cite it inline like " +
    "[Source: <title>].",
});
// ===== END PHASE 7 =====
