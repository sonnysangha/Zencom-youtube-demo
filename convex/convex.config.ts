import { defineApp } from "convex/server";

const app = defineApp();
// Components registered by later phases: Agent, RAG, persistent-text-streaming, rate-limiter.

export default app;
