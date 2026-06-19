"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  blurb: string;
  monthly: number | null;
  annual: number | null;
  unit: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    blurb: "Everything a small team needs to get started with shared support.",
    monthly: 0,
    annual: 0,
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
    blurb: "AI-powered support and billing for growing teams.",
    monthly: 29,
    annual: 24,
    unit: "per seat / month",
    cta: { label: "Start free trial", href: "/sign-up" },
    highlighted: true,
    features: [
      "Unlimited seats",
      "AI answers with source citations",
      "Unlimited knowledge bases",
      "Public help center",
      "Lead capture & CSV export",
      "Roles & permissions",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Advanced control, security, and scale for larger organizations.",
    monthly: null,
    annual: null,
    unit: "custom pricing",
    cta: { label: "Contact sales", href: "/sign-up" },
    features: [
      "Everything in Pro",
      "SSO & SAML",
      "Advanced usage analytics",
      "Custom AI quotas",
      "Dedicated success manager",
      "SLA & uptime guarantee",
    ],
  },
];

/**
 * Static pricing plan cards with a monthly/annual toggle.
 *
 * Phase 5 ships the live, entitlement-aware <PricingTable for="organization" />.
 * This component is intentionally self-contained so it can be swapped for, or
 * rendered above the dashboard, the live table at integration time without
 * touching the surrounding page layout or FAQ.
 */
export function PricingPlans() {
  const [annual, setAnnual] = useState(true);

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            "text-sm font-medium",
            !annual ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((v) => !v)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            annual ? "bg-brand" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "inline-block size-5 transform rounded-full bg-background shadow transition-transform",
              annual ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm font-medium",
            annual ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Annual
        </span>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
          Save 17%
        </span>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = annual ? plan.annual : plan.monthly;
          return (
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
                {price === null ? (
                  <span className="text-3xl font-semibold tracking-tight">
                    Custom
                  </span>
                ) : (
                  <>
                    <span className="text-4xl font-semibold tracking-tight">
                      ${price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      {plan.unit}
                    </span>
                  </>
                )}
              </div>
              {price !== null && annual && price > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  billed annually
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {price === null ? "talk to us" : " "}
                </p>
              )}

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
          );
        })}
      </div>
    </div>
  );
}
