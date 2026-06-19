import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/marketing/product-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 mk-grid-bg opacity-40" />
        <div className="mk-aurora absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        <div className="mk-aurora absolute -top-20 right-[10%] size-[28rem] rounded-full bg-brand/15 blur-[110px] [animation-delay:-6s]" />
        <div className="mk-aurora absolute top-32 left-[8%] size-[24rem] rounded-full bg-primary/10 blur-[110px] [animation-delay:-12s]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
        <Link
          href="/#features"
          className="mk-reveal group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
          style={{ ["--mk-delay" as string]: "0ms" }}
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Sparkles className="size-2.5" />
          </span>
          AI answers, grounded in your knowledge base
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <h1
          className="mk-reveal mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl"
          style={{ ["--mk-delay" as string]: "80ms" }}
        >
          Customer support,{" "}
          <span className="mk-gradient-text">reinvented</span> for modern teams.
        </h1>

        <p
          className="mk-reveal mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg"
          style={{ ["--mk-delay" as string]: "160ms" }}
        >
          A real-time shared inbox, AI-powered answers from your knowledge base,
          and a self-serve help center — all in one multi-tenant workspace your
          whole team will love.
        </p>

        <div
          className="mk-reveal mt-9 flex flex-col items-center gap-3 sm:flex-row"
          style={{ ["--mk-delay" as string]: "240ms" }}
        >
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
              <Link href="/install">See how it works</Link>
            </Button>
          </Show>
        </div>

        <div
          className="mk-reveal mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4"
          style={{ ["--mk-delay" as string]: "320ms" }}
        >
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="size-3.5 fill-brand text-brand"
                aria-hidden
              />
            ))}
          </div>
          <span>Loved by support teams at 2,000+ companies</span>
        </div>

        {/* Floating product preview */}
        <div
          className="mk-reveal-fade mt-16 w-full"
          style={{ ["--mk-delay" as string]: "420ms" }}
        >
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
