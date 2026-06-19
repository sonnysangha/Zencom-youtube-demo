import type { Metadata } from "next";
import { PricingTable, Show } from "@clerk/nextjs";

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { PricingComparison } from "@/components/marketing/pricing-comparison";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";

/**
 * Public pricing page.
 *
 * Combines Phase 6's marketing layout (header, hero, comparison table, FAQ,
 * footer) with Phase 5's live Clerk billing table.
 *
 * Plan cards are auth-aware via Clerk's async <Show>:
 *   - Signed-out / no active org → static, public-facing <PricingPlans /> cards
 *     (prices + features mirror the Clerk Billing config exactly). Clerk's
 *     <PricingTable> renders nothing useful without an authenticated org, so the
 *     static cards guarantee the public page always looks right.
 *   - Signed-in → the live, checkout-enabled `<PricingTable for="organization" />`,
 *     which surfaces the three Organization Plans configured in Clerk Billing
 *     (Free / Pro / Enterprise) and opens the in-app checkout drawer on
 *     selection. `for="organization"` is required because the plans are
 *     org-scoped.
 *
 * Public route: added to the proxy matcher so it renders without auth.
 *
 * Real plan facts (Clerk Billing → Organization Plans, per seat / month):
 *   Free $0 · Pro $40 · Enterprise $120 — no annual discount, no free trial.
 */
export const metadata: Metadata = {
  title: "Pricing — Zencom",
  description:
    "Seat-based pricing for the Zencom support platform. Free, Pro ($40/seat), and Enterprise ($120/seat) plans with AI agent replies, a shared inbox, and a knowledge base.",
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does seat-based pricing work?",
    answer:
      "You pay per active seat in your workspace, each month: Free is $0 for up to 3 seats, Pro is $40 per seat, and Enterprise is $120 per seat. Add or remove teammates anytime — billing updates automatically through Clerk Billing.",
  },
  {
    question: "What's included in the Free plan?",
    answer:
      "The Free plan covers the essentials for a small team: the real-time shared inbox, the website chat widget, and a knowledge base — up to 3 seats, at no cost. Upgrade to Pro when you want AI agent replies, lead capture, widget customization, and analytics.",
  },
  {
    question: "What do the AI agent replies do?",
    answer:
      "On Pro and Enterprise, the AI agent drafts and sends replies to customers grounded in your knowledge base, with cited sources. It's part of the plan entitlement — there's no separate per-message add-on to manage.",
  },
  {
    question: "What does Enterprise add over Pro?",
    answer:
      "Enterprise ($120 per seat / month) includes everything in Pro plus SSO / SAML sign-in, audit logs, and priority support — built for larger organizations with stricter security and compliance needs.",
  },
  {
    question: "Do you support multiple brands or teams?",
    answer:
      "Yes. Zencom is multi-tenant by design — each organization gets an isolated, secure workspace with its own team, data, branding, and billing.",
  },
  {
    question: "Can I change or cancel my plan later?",
    answer:
      "Yes — upgrade, downgrade, or cancel at any time directly from your dashboard. Self-serve checkout and billing management are built in through Clerk Billing, so there's no sales gate for any plan.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <MarketingHeader />
      <main className="flex-1">
        {/* hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 mk-grid-bg opacity-30" />
            <div className="mk-aurora absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
          </div>
          <div className="mx-auto w-full max-w-6xl px-6 pb-4 pt-20 text-center sm:pt-28">
            <Reveal>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-brand backdrop-blur">
                Pricing
              </span>
              <h1 className="mx-auto mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Simple pricing that scales with your team
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
                Start free, upgrade when you&apos;re ready. Every plan includes
                the real-time shared inbox and website widget — pay only for the
                seats you use.
              </p>
            </Reveal>
          </div>
        </section>

        {/* plan cards — static for the public page, live checkout once signed in */}
        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <Show
            when="signed-in"
            fallback={
              <Reveal>
                <PricingPlans />
              </Reveal>
            }
          >
            <PricingTable for="organization" />
          </Show>
        </section>

        {/* comparison table */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <Reveal className="mb-10 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Compare every feature
            </h2>
            <p className="mt-3 text-muted-foreground">
              A detailed look at what&apos;s included in each plan.
            </p>
          </Reveal>
          <Reveal>
            <PricingComparison />
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <Reveal className="mb-10 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything else you might be wondering about.
            </p>
          </Reveal>
          <Reveal>
            <Faq items={FAQ_ITEMS} />
          </Reveal>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
