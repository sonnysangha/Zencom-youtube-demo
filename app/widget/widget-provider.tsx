"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

/**
 * A PLAIN Convex client for the embeddable widget — deliberately NOT
 * ConvexProviderWithClerk. The widget runs inside an iframe on third-party
 * sites and must work for anonymous visitors with no Clerk session. All trust
 * is carried by the workspace publicKey + visitor token passed to the public
 * Convex functions; nothing here attaches a Clerk JWT.
 */
export function WidgetConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
    }
    return new ConvexReactClient(url);
  }, []);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
