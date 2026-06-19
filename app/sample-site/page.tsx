import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Globe,
  Leaf,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";

import { SampleSandbox } from "./sample-sandbox";

// This is a fictional company used purely to preview the Zencom widget on a
// realistic third-party site. It is intentionally unrelated to Zencom's own
// branding and must never be indexed.
export const metadata: Metadata = {
  title: "Northwind — Logistics, simplified",
  robots: { index: false, follow: false },
};

const NAV_LINKS = ["Platform", "Solutions", "Pricing", "Customers", "Docs"];

const FEATURES = [
  {
    icon: Truck,
    title: "Live shipment tracking",
    desc: "Follow every parcel across carriers in one real-time map, with proactive delay alerts before customers notice.",
  },
  {
    icon: Boxes,
    title: "Smart inventory",
    desc: "Forecast demand per SKU and auto-replenish warehouses so you never oversell or sit on dead stock.",
  },
  {
    icon: BarChart3,
    title: "Margin analytics",
    desc: "See landed cost, carrier spend, and per-route profitability in dashboards your finance team will actually trust.",
  },
  {
    icon: Globe,
    title: "Global by default",
    desc: "Customs docs, duties, and multi-currency billing handled automatically across 180 countries.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade security",
    desc: "SOC 2 Type II, SSO, granular roles, and full audit trails baked into every plan.",
  },
  {
    icon: Zap,
    title: "Automations",
    desc: "Trigger reorders, refunds, and notifications from simple rules — no engineering tickets required.",
  },
];

const STATS = [
  { value: "12M+", label: "shipments routed monthly" },
  { value: "99.98%", label: "platform uptime" },
  { value: "180", label: "countries supported" },
  { value: "4.9/5", label: "average customer rating" },
];

export default function SampleSitePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Leaf className="size-4" />
            </span>
            Northwind
          </a>
          <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                className="transition-colors hover:text-zinc-900"
              >
                {link}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:block"
            >
              Sign in
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Get a demo
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-emerald-100 blur-[120px]"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-20 lg:grid-cols-2 lg:pt-28">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Sparkles className="size-3.5" />
                New: AI route optimization
              </span>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Logistics that runs itself
              </h1>
              <p className="mt-5 max-w-lg text-pretty text-lg text-zinc-600">
                Northwind connects your carriers, warehouses, and storefront
                into one platform — so orders ship faster, customers stay
                happy, and your margins grow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Start free trial
                  <ArrowRight className="size-4" />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Talk to sales
                </a>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                No credit card required · 14-day free trial
              </p>
            </div>

            {/* Faux product card */}
            <div className="relative">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl shadow-zinc-900/5">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                  <p className="text-sm font-semibold">Today&apos;s shipments</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    On track
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {STATS.slice(0, 2).map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl bg-zinc-50 p-4"
                    >
                      <p className="text-2xl font-semibold tracking-tight">
                        {s.value}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {["Carrier handoff", "Customs cleared", "Out for delivery"].map(
                    (step, i) => (
                      <div key={step} className="flex items-center gap-3">
                        <span
                          className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                            i < 2
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-200 text-zinc-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm text-zinc-700">{step}</span>
                        <span className="ml-auto h-1.5 flex-1 max-w-[40%] overflow-hidden rounded-full bg-zinc-100">
                          <span
                            className="block h-full rounded-full bg-emerald-500"
                            style={{ width: i < 2 ? "100%" : "45%" }}
                          />
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logo strip */}
        <section className="border-y border-zinc-100 bg-zinc-50/60">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-8 text-sm font-semibold text-zinc-400">
            <span>ACME Foods</span>
            <span>Helios Retail</span>
            <span>Orbit Goods</span>
            <span>Vertex Supply</span>
            <span>Marlow &amp; Co</span>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Everything your supply chain needs
            </h2>
            <p className="mt-3 text-zinc-600">
              One platform to plan, ship, track, and analyze — without the
              spreadsheet sprawl.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats band */}
        <section className="bg-zinc-900 text-white">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-16 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="rounded-3xl bg-emerald-600 px-8 py-14 text-center text-white sm:px-16">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to ship smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-emerald-50">
              Join thousands of teams running their logistics on Northwind.
              Have a question? Tap the chat bubble in the corner.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-6 py-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                Start free trial
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-400 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                Book a demo
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-zinc-700">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Leaf className="size-3.5" />
            </span>
            Northwind
          </div>
          <p>© {new Date().getFullYear()} Northwind Inc. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="transition-colors hover:text-zinc-900">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-zinc-900">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-zinc-900">
              Status
            </a>
          </div>
        </div>
      </footer>

      <SampleSandbox />
    </div>
  );
}
