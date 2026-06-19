import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  blurb: string;
  /** Monthly price per seat in USD, or null for free. */
  price: number;
  unit: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
  features: string[];
}

/**
 * Plans mirror the live Clerk Billing → Organization Plans configuration
 * (slugs free_org / pro / enterprise). Prices are per seat / month and match
 * Clerk exactly: Free $0, Pro $40, Enterprise $120. Clerk has no annual
 * discount configured (annual_monthly_amount === monthly amount on every plan),
 * so there is intentionally no monthly/annual toggle here. Feature lists are
 * derived from each plan's Clerk feature slugs (see lib/entitlements.ts):
 *   free_org   → shared_inbox, knowledge_base
 *   pro        → + ai_agent, lead_capture, widget_customization, analytics
 *   enterprise → + sso, audit_logs, priority_support
 */
const PLANS: Plan[] = [
  {
    id: "free_org",
    name: "Free",
    blurb: "Get started with the essentials for a small support team.",
    price: 0,
    unit: "per seat / month",
    cta: { label: "Start free", href: "/sign-up" },
    features: [
      "Up to 3 seats",
      "Real-time shared inbox",
      "Website chat widget",
      "1 knowledge base",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "AI-powered support and lead capture for growing teams.",
    price: 40,
    unit: "per seat / month",
    cta: { label: "Get started", href: "/sign-up" },
    highlighted: true,
    features: [
      "Everything in Free",
      "Unlimited seats",
      "AI agent replies with cited sources",
      "Unlimited knowledge bases & help center",
      "Lead capture with CSV export",
      "Full widget customization",
      "Analytics & reporting",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Advanced security, controls, and support for large organizations.",
    price: 120,
    unit: "per seat / month",
    cta: { label: "Get started", href: "/sign-up" },
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "Audit logs",
      "Priority support",
      "Org-isolated, multi-tenant workspaces",
    ],
  },
];

/**
 * Static, public-facing pricing plan cards. Designed to render correctly for
 * signed-out visitors (the live <PricingTable for="organization" /> only renders
 * its checkout-enabled cards for an authenticated org). Prices and features are
 * kept in sync with the Clerk Billing config above.
 */
export function PricingPlans() {
  return (
    <div className="mt-4 grid items-start gap-6 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "relative flex h-full flex-col rounded-2xl border bg-card p-7 transition-all duration-300",
            plan.highlighted
              ? "border-brand/50 shadow-xl shadow-brand/10 lg:-translate-y-2"
              : "border-border/70 hover:border-brand/30",
          )}
        >
          {plan.highlighted ? (
            <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground shadow">
              <Sparkles className="size-3" /> Most popular
            </span>
          ) : null}

          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-1.5 min-h-10 text-sm text-muted-foreground">
            {plan.blurb}
          </p>

          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight">
              ${plan.price}
            </span>
            <span className="text-sm text-muted-foreground"> {plan.unit}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.price === 0 ? "free forever" : "billed monthly, per seat"}
          </p>

          <Button
            asChild
            className="mt-6 w-full"
            variant={plan.highlighted ? "default" : "outline"}
          >
            <Link href={plan.cta.href}>{plan.cta.label}</Link>
          </Button>

          <ul className="mt-7 flex flex-col gap-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Check className="size-3" />
                </span>
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
