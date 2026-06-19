import { Suspense } from "react";
import { WidgetConvexProvider } from "./widget-provider";
import { WidgetApp } from "./widget-app";

/**
 * Standalone widget surface, loaded inside the embed.js iframe at
 * /widget?key=PUBLICKEY. It uses a plain (no-Clerk) Convex client and talks
 * only to the public widget.* functions. The page is intentionally minimal
 * chrome — the launcher/badge live in the parent page via embed.js.
 */
export const dynamic = "force-dynamic";

export default function WidgetPage() {
  return (
    <WidgetConvexProvider>
      <Suspense fallback={null}>
        <WidgetApp />
      </Suspense>
    </WidgetConvexProvider>
  );
}
