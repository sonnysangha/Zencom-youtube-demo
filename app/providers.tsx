"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL. Add it to .env.local (run `npx convex dev`).",
  );
}

const convex = new ConvexReactClient(convexUrl);

/**
 * Wraps the app in the Convex client bound to Clerk auth.
 *
 * Must be rendered *inside* <ClerkProvider> (see app/layout.tsx) because
 * ConvexProviderWithClerk consumes Clerk's `useAuth` to attach the session
 * token to every Convex request. Convex validates that token against the
 * issuer configured in convex/auth.config.ts.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
