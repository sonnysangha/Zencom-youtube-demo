import {
  Inbox,
  BookOpen,
  Bot,
  CreditCard,
  Users,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";

const primary = [
  {
    icon: Inbox,
    title: "Real-time shared inbox",
    desc: "Every conversation from email and your site widget lands in one live, collaborative inbox. Assign, reply, and hand off — your team always sees the latest.",
    points: ["Live multi-agent sync", "Human takeover", "Assignment & status"],
  },
  {
    icon: BookOpen,
    title: "Self-serve knowledge base",
    desc: "Publish articles and a branded help center. Import your existing docs — Markdown, text, or PDF — and they become searchable answers instantly.",
    points: ["Markdown / PDF import", "Public help center", "Full-text search"],
  },
  {
    icon: Bot,
    title: "AI answers that cite sources",
    desc: "Grounded in your knowledge base, the AI drafts and sends accurate replies token-by-token — with citations — and steps aside the moment a human takes over.",
    points: ["RAG-grounded replies", "Source citations", "Streaming responses"],
  },
  {
    icon: CreditCard,
    title: "Seat-based billing built in",
    desc: "Free, Pro, and Enterprise plans with per-seat pricing, self-serve checkout, and usage gating. Scale your workspace without leaving the app.",
    points: ["Per-seat plans", "Self-serve checkout", "Usage & quotas"],
  },
];

const secondary = [
  {
    icon: Users,
    title: "Multi-tenant workspaces",
    desc: "Every customer gets an isolated, secure workspace with their own team, data, and branding.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & permissions",
    desc: "Admin and member roles with fine-grained, organization-scoped access control out of the box.",
  },
  {
    icon: Zap,
    title: "Lightning-fast & reactive",
    desc: "Built on a reactive backend — updates propagate instantly to every connected agent, no refresh needed.",
  },
  {
    icon: Globe,
    title: "Drop-in website widget",
    desc: "Add a single script tag to embed the chat widget anywhere. Customize colors, position, and behavior.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-brand">
          Everything in one place
        </span>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          One platform for your whole support workflow
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Inbox, knowledge base, AI, and billing — designed to work together so
          your team can focus on customers, not tools.
        </p>
      </Reveal>

      {/* primary feature cards */}
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {primary.map((f, i) => (
          <Reveal key={f.title} delay={i * 80}>
            <article className="group relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-brand/5 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {f.points.map((p) => (
                  <li
                    key={p}
                    className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      {/* secondary feature grid */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {secondary.map((f, i) => (
          <Reveal key={f.title} delay={i * 60}>
            <article className="h-full rounded-2xl border border-border/70 bg-card p-6 transition-colors duration-300 hover:border-brand/30">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                <f.icon className="size-4.5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
