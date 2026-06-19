import Link from "next/link";
import { PricingTable } from "@clerk/nextjs";
import { ArrowLeft, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * PHASE 5 — Public pricing page.
 *
 * Renders Clerk's `<PricingTable for="organization" />`, which shows the three
 * Organization Plans configured in Clerk Billing (Free / Pro / Enterprise) and
 * opens Clerk's in-app checkout drawer on selection. Plans are org-scoped, so
 * `for="organization"` is required — without it the table renders the (empty)
 * user-plan catalog.
 *
 * Public route: added to the proxy matcher so it renders without auth. When a
 * signed-out visitor picks a paid plan, Clerk routes them through sign-in /
 * org-selection before checkout.
 */
export const metadata = {
  title: "Pricing — Zencom",
  description:
    "Seat-based plans for support teams of every size. Free, Pro, and Enterprise.",
};

const COMPARISON: { tier: string; blurb: string; features: string[] }[] = [
  {
    tier: "Free",
    blurb: "The essentials for a small team getting started.",
    features: ["Shared inbox", "Knowledge base"],
  },
  {
    tier: "Pro",
    blurb: "AI-powered support and lead capture for growing teams.",
    features: [
      "Everything in Free",
      "AI agent replies",
      "Lead capture",
      "Widget customization",
      "Analytics & reporting",
    ],
  },
  {
    tier: "Enterprise",
    blurb: "Advanced security and controls for large organizations.",
    features: [
      "Everything in Pro",
      "Priority support",
      "SSO / SAML",
      "Audit logs",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16">
      <div className="flex flex-col gap-4 text-center">
        <div className="flex justify-center">
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </Button>
        </div>
        <Badge variant="secondary" className="mx-auto w-fit">
          Seat-based organization plans
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Pricing that scales with your team
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Every plan is billed to your organization. Upgrade, downgrade, or
          cancel anytime from your billing dashboard.
        </p>
      </div>

      {/* Clerk's live, checkout-enabled org pricing table. */}
      <PricingTable for="organization" />

      {/* Static comparison fallback so the page is meaningful even before the
          Clerk table hydrates. */}
      <section className="grid gap-6 sm:grid-cols-3">
        {COMPARISON.map((plan) => (
          <div
            key={plan.tier}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold">{plan.tier}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
