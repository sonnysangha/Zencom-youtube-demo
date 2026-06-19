import { Star } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";

const logos = [
  "Northwind",
  "Acme Co",
  "Lumen",
  "Globex",
  "Initech",
  "Hooli",
  "Umbra",
  "Vertex",
];

const stats = [
  { value: "2,000+", label: "support teams" },
  { value: "12M+", label: "conversations handled" },
  { value: "68%", label: "auto-resolved by AI" },
  { value: "<2 min", label: "median first response" },
];

const testimonials = [
  {
    quote:
      "We replaced three tools with Zencom. The shared inbox plus AI answers cut our response times in half within the first week.",
    name: "Priya Anand",
    role: "Head of Support, Northwind",
    initials: "PA",
  },
  {
    quote:
      "The knowledge-base-grounded AI is the real deal — it cites sources, so our team actually trusts the drafts it writes.",
    name: "Marco Silva",
    role: "CX Lead, Lumen",
    initials: "MS",
  },
  {
    quote:
      "Multi-tenant workspaces and seat-based billing meant we could roll Zencom out to every brand we operate, no workarounds.",
    name: "Dana Wu",
    role: "Operations Director, Globex",
    initials: "DW",
  },
];

export function SocialProof() {
  return (
    <section className="border-y border-border/60 bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Trusted by modern support teams worldwide
          </p>
        </Reveal>

        {/* logo marquee */}
        <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="mk-marquee flex w-max items-center gap-12">
            {[...logos, ...logos].map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                className="select-none text-lg font-semibold tracking-tight text-muted-foreground/70"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        {/* stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 70} className="text-center">
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </Reveal>
          ))}
        </div>

        {/* testimonials */}
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <figure className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="size-4 fill-brand text-brand"
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {t.initials}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
