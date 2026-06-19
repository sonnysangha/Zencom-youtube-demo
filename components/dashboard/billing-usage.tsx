"use client";

import { useQuery } from "convex/react";
import { Activity } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * PHASE 5 — Live usage meters for the billing dashboard.
 *
 * Reads the reactive `billing.usageForOrg` query (org-scoped server-side). Other
 * tracks populate these meters by calling `billing.incrementUsage` as they
 * record usage (AI replies, KB docs, etc.), so this surface fills in
 * automatically as consuming features land — no changes needed here.
 */

// Friendly labels for known metric slugs; unknown metrics fall back to the raw
// slug so newly-introduced meters still render.
const METRIC_LABELS: Record<string, string> = {
  ai_messages: "AI replies",
  kb_documents: "Knowledge base documents",
  widget_sessions: "Widget sessions",
  notifications: "Notifications sent",
};

export function BillingUsage() {
  const meters = useQuery(api.billing.usageForOrg);

  if (meters === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-56" />
      </div>
    );
  }

  if (meters.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="size-4" />
        No usage recorded yet this period.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Activity className="size-4 text-primary" />
        Usage
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {meters.map((meter) => (
          <div
            key={`${meter.metric}:${meter.period}`}
            className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
          >
            <dt className="text-sm text-muted-foreground">
              {METRIC_LABELS[meter.metric] ?? meter.metric}
              <span className="ml-1 text-xs text-muted-foreground/70">
                ({meter.period})
              </span>
            </dt>
            <dd className="text-sm font-semibold tabular-nums">
              {meter.count.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
