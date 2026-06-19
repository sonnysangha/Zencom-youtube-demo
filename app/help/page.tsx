import { LifeBuoy } from "lucide-react";

/**
 * Phase 3 — Bare /help landing. The real help center lives at
 * /help/<workspace-public-key>; this page exists so the route isn't a 404 and
 * explains the addressing scheme.
 */
export default function HelpRootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <LifeBuoy className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Help center</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Each workspace has its own help center at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          /help/&lt;workspace-key&gt;
        </code>
        . Open it from your dashboard under Knowledge base.
      </p>
    </div>
  );
}
