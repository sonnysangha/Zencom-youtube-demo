import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();

// ===== PHASE 3: Knowledge base + RAG core =====
// Agent (threads + delta streaming), RAG (semantic search / embeddings, one
// namespace per orgId), and persistent-text-streaming (durable token streaming).
app.use(agent);
app.use(rag);
app.use(persistentTextStreaming);
// ===== END PHASE 3 =====

// Components registered by later phases: rate-limiter, etc.

// ===== PHASE 5: Billing & plans =====
// Backs Convex-side quota / usage metering primitives that other tracks import
// (see convex/lib/quota.ts).
app.use(rateLimiter);
// ===== END PHASE 5 =====

export default app;
