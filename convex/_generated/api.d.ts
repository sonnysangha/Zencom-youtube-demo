/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as askKb from "../askKb.js";
import type * as billing from "../billing.js";
import type * as help from "../help.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as ingest from "../ingest.js";
import type * as knowledge from "../knowledge.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_customFunctions from "../lib/customFunctions.js";
import type * as lib_inbox from "../lib/inbox.js";
import type * as lib_quota from "../lib/quota.js";
import type * as lib_roles from "../lib/roles.js";
import type * as members from "../members.js";
import type * as pdf from "../pdf.js";
import type * as widget from "../widget.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  askKb: typeof askKb;
  billing: typeof billing;
  help: typeof help;
  http: typeof http;
  inbox: typeof inbox;
  ingest: typeof ingest;
  knowledge: typeof knowledge;
  "lib/ai": typeof lib_ai;
  "lib/auth": typeof lib_auth;
  "lib/customFunctions": typeof lib_customFunctions;
  "lib/inbox": typeof lib_inbox;
  "lib/quota": typeof lib_quota;
  "lib/roles": typeof lib_roles;
  members: typeof members;
  pdf: typeof pdf;
  widget: typeof widget;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  persistentTextStreaming: import("@convex-dev/persistent-text-streaming/_generated/component.js").ComponentApi<"persistentTextStreaming">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
