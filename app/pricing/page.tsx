import type { Metadata } from "next";

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { PricingComparison } from "@/components/marketing/pricing-comparison";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Pricing — Zencom",
  description:
    "Simple, seat-based pricing for the Zencom support platform. Free, Pro, and Enterprise plans with AI answers, a shared inbox, and a knowledge base.",
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does seat-based pricing work?",
    answer:
      "You pay per active seat in your workspace, each month. Add or remove teammates anytime — billing updates automatically and is prorated. The Free plan includes up to 3 seats at no cost.",
  },
  {
    question: "Can I try Pro before paying?",
    answer:
      "Yes. Every workspace can start a Pro trial with full access to AI answers, unlimited knowledge bases, and lead capture. No credit card is required to begin, and you can downgrade to Free at any time.",
  },
  {
    question: "What counts as an AI message?",
    answer:
      "An AI message is a single AI-generated reply to a customer, grounded in your knowledge base with cited sources. Pro includes a generous monthly quota; Enterprise customers get custom quotas tuned to their volume.",
  },
  {
    question: "Do you support multiple brands or teams?",
    answer:
      "Absolutely. Zencom is multi-tenant by design — each organization gets an isolated, secure workspace with its own team, data, branding, and billing. Enterprise customers can run many workspaces under one agreement.",
  },
  {
    question: "Is SSO available?",
    answer:
      "SSO and SAML are included on the Enterprise plan, alongside advanced analytics, custom AI quotas, an SLA, and a dedicated success manager.",
  },
  {
    question: "Can I change or cancel my plan later?",
    answer:
      "Yes — upgrade, downgrade, or cancel at any time directly from your dashboard. Self-serve checkout and billing management are built in, so there's never a sales gate for standard plans.",
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

        {/* plan cards */}
        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <PricingPlans />
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
