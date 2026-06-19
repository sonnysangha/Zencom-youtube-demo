import { defineApp } from "convex/server";
// ===== PHASE 5: Billing & plans =====
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
// ===== END PHASE 5 =====

const app = defineApp();
// Components registered by later phases: Agent, RAG, persistent-text-streaming, rate-limiter.

// ===== PHASE 5: Billing & plans =====
// Backs Convex-side quota / usage metering primitives that other tracks import
// (see convex/lib/quota.ts).
app.use(rateLimiter);
// ===== END PHASE 5 =====

export default app;
