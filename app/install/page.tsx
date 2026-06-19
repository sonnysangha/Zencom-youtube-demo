import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  KeyRound,
  MousePointerClick,
  Palette,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { CodeBlock } from "@/components/marketing/code-block";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Install the widget — Zencom",
  description:
    "Add the Zencom chat widget to any website with a single copy-paste script tag. Works with any framework or plain HTML.",
};

const EMBED_SNIPPET = `<!-- Zencom widget -->
<script>
  window.zencomSettings = { publicKey: "YOUR_PUBLIC_KEY" };
</script>
<script
  src="https://app.zencom.io/embed.js"
  data-zencom-key="YOUR_PUBLIC_KEY"
  async
></script>`;

const NPM_SNIPPET = `import { Zencom } from "@zencom/widget";

Zencom.init({
  publicKey: "YOUR_PUBLIC_KEY",
  position: "bottom-right",
});`;

const STEPS = [
  {
    icon: KeyRound,
    title: "Grab your public key",
    desc: "In your dashboard, open the widget customizer. Your workspace's public key is shown at the top of the install snippet — it's safe to expose in client-side code.",
  },
  {
    icon: Code2,
    title: "Paste the snippet",
    desc: "Drop the script tag just before the closing </body> tag on every page where you want the widget to appear. No build step required.",
  },
  {
    icon: Palette,
    title: "Customize the look",
    desc: "Set colors, position, radius, and proactive messages from the dashboard. Changes go live instantly — no need to touch the code again.",
  },
  {
    icon: Rocket,
    title: "Go live",
    desc: "Publish your site. Visitors can now chat with your team and get instant AI answers grounded in your knowledge base.",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Which platforms does the widget support?",
    answer:
      "Any website where you can add a script tag — plain HTML, WordPress, Shopify, Webflow, Next.js, React, Vue, and more. For SPA frameworks you can also use the npm package for tighter control.",
  },
  {
    question: "Is the public key safe to expose?",
    answer:
      "Yes. The public key only identifies your workspace to the widget. All sensitive operations are validated server-side against a per-visitor session token, and your organization data is never derived from the client.",
  },
  {
    question: "Will the widget slow down my site?",
    answer:
      "No. The embed script is loaded asynchronously and lazily, so it never blocks your page from rendering. The widget UI is only fetched when a visitor opens it.",
  },
  {
    question: "Can I control where it appears?",
    answer:
      "Yes — choose the corner, margins, and z-index from the customizer, or only include the script on the pages where you want it. Proactive messages can be toggled and delayed per your preference.",
  },
];

export default function InstallPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <MarketingHeader />
      <main className="flex-1">
        {/* hero + snippet */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 mk-grid-bg opacity-30" />
            <div className="mk-aurora absolute -top-32 right-1/4 size-[32rem] rounded-full bg-brand/15 blur-[120px]" />
          </div>

          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-12 pt-20 sm:pt-28 lg:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-brand backdrop-blur">
                Install in 2 minutes
              </span>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Add Zencom to your site with one snippet
              </h1>
              <p className="mt-5 max-w-lg text-pretty text-muted-foreground">
                Copy the embed code below, paste it into your site, and the chat
                widget is live. Works with any framework — or plain HTML.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="group">
                  <Link href="/sign-up">
                    Get your public key
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/pricing">View plans</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <CodeBlock label="index.html" code={EMBED_SNIPPET} />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Replace{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">
                  YOUR_PUBLIC_KEY
                </code>{" "}
                with the key from your dashboard.
              </p>
            </Reveal>
          </div>
        </section>

        {/* steps */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <Reveal className="mb-12 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Four steps to a live widget
            </h2>
            <p className="mt-3 text-muted-foreground">
              No complex setup, no dependencies to manage.
            </p>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 70}>
                <div className="relative h-full rounded-2xl border border-border/70 bg-card p-6">
                  <span className="absolute right-5 top-5 text-3xl font-semibold tabular-nums text-muted-foreground/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15">
                    <step.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* npm alternative */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <MousePointerClick className="size-3.5" /> For SPA frameworks
              </span>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight">
                Prefer npm? Use the package
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground">
                If you build with React, Vue, or another SPA framework, install
                the package and initialize the widget in code for tighter control
                over lifecycle and routing.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-brand" />
                  Per-visitor session tokens, validated server-side
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-brand" />
                  Loaded asynchronously — never blocks your render
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-brand" />
                  Fully typed init options
                </li>
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <CodeBlock label="widget.ts" code={NPM_SNIPPET} />
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <Reveal className="mb-10 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight">
              Install questions
            </h2>
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
