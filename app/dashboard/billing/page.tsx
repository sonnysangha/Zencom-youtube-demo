import { auth } from "@clerk/nextjs/server";
import { PricingTable } from "@clerk/nextjs";
import { ShieldAlert, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getActivePlan, PLANS } from "@/lib/entitlements";
import { BillingUsage } from "@/components/dashboard/billing-usage";

/**
 * PHASE 5 — Admin-gated billing dashboard.
 *
 * Shows the active org plan + usage, and embeds Clerk's org `<PricingTable />`
 * so admins can upgrade / downgrade / cancel via Clerk's in-app checkout
 * drawer. Gated to `org:admin` exactly like the Team page.
 */

const PLAN_LABEL: Record<string, string> = {
  [PLANS.free]: "Free",
  [PLANS.pro]: "Pro",
  [PLANS.enterprise]: "Enterprise",
};

export default async function BillingPage() {
  const { has } = await auth();

  if (!has({ role: "org:admin" })) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Admins only</h2>
        <p className="text-sm text-muted-foreground">
          Billing is restricted to workspace admins. Ask an admin to update your
          role if you need access.
        </p>
      </div>
    );
  }

  const activePlan = await getActivePlan();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization&apos;s plan, seats, and usage.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Current plan
            </CardTitle>
            <CardDescription>
              Your organization is on the{" "}
              <span className="font-medium text-foreground">
                {PLAN_LABEL[activePlan] ?? activePlan}
              </span>{" "}
              plan.
            </CardDescription>
          </div>
          <Badge
            variant={activePlan === PLANS.free ? "secondary" : "default"}
            className="shrink-0 text-sm"
          >
            {PLAN_LABEL[activePlan] ?? activePlan}
          </Badge>
        </CardHeader>
        <CardContent>
          <BillingUsage />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Plans</h2>
        <p className="text-sm text-muted-foreground">
          Upgrade or change your plan. Changes apply to the whole organization.
        </p>
      </div>
      <PricingTable for="organization" />
    </div>
  );
}
