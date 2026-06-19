import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

const perks = [
  "Free plan, no credit card",
  "Set up in minutes",
  "Cancel anytime",
];

export function CTA() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-16 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 mk-grid-bg opacity-30" />
            <div className="mk-aurora absolute -top-24 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
          </div>

          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Give your customers support they&apos;ll rave about.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Start free today — bring your team, import your docs, and let AI
            handle the repetitive questions while you focus on the hard ones.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Show
              when="signed-out"
              fallback={
                <Button asChild size="lg" className="group">
                  <Link href="/dashboard">
                    Go to dashboard
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              }
            >
              <Button asChild size="lg" className="group">
                <Link href="/sign-up">
                  Start free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/pricing">Compare plans</Link>
              </Button>
            </Show>
          </div>

          <ul className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
