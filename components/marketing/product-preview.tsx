import {
  Bot,
  Inbox,
  Search,
  Sparkles,
  BookOpen,
  CircleCheck,
} from "lucide-react";

const threads = [
  { name: "Priya Anand", msg: "Where can I download my invoice?", unread: true },
  { name: "Marco Silva", msg: "Is SSO available on the Pro plan?", unread: false },
  { name: "Dana Wu", msg: "Thanks — that fixed it!", unread: false },
];

/**
 * Stylized, dependency-free product preview used in the hero. Pure markup +
 * theme tokens — no real data, no screenshots to ship.
 */
export function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="mk-float overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-brand/5 ring-1 ring-border/40">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
          <span className="size-3 rounded-full bg-destructive/60" />
          <span className="size-3 rounded-full bg-brand/40" />
          <span className="size-3 rounded-full bg-primary/30" />
          <div className="ml-4 hidden items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground sm:flex">
            <Search className="size-3" />
            app.zencom.io/dashboard/inbox
          </div>
        </div>

        <div className="grid min-h-[22rem] grid-cols-1 sm:grid-cols-[200px_1fr]">
          {/* sidebar / thread list */}
          <div className="hidden flex-col gap-1 border-r border-border/60 bg-muted/20 p-3 sm:flex">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-foreground">
              <Inbox className="size-3.5 text-brand" /> Shared inbox
            </div>
            {threads.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {t.name}
                  </span>
                  {t.unread ? (
                    <span className="size-1.5 rounded-full bg-brand" />
                  ) : null}
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {t.msg}
                </span>
              </div>
            ))}
          </div>

          {/* conversation pane */}
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                PA
              </span>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                Where can I download my invoice?
              </div>
            </div>

            <div className="flex items-start justify-end gap-3">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-sm text-brand-foreground">
                You can grab any invoice under{" "}
                <span className="font-medium">Billing → Invoices</span>. I&apos;ve
                emailed your latest one too. 🎟️
                <div className="mt-2 flex items-center gap-1.5 border-t border-brand-foreground/20 pt-2 text-[11px] text-brand-foreground/80">
                  <BookOpen className="size-3" />
                  Source: Billing &amp; invoices guide
                </div>
              </div>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                <Bot className="size-4" />
              </span>
            </div>

            <div className="mt-auto flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
              <Sparkles className="size-4 text-brand" />
              <span className="text-sm text-muted-foreground">
                AI drafted a reply from your knowledge base
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-1 text-[11px] font-medium text-brand">
                <CircleCheck className="size-3" /> Ready to send
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* floating stat chips */}
      <div className="mk-float absolute -left-4 top-1/3 hidden rounded-xl border border-border/70 bg-card/95 px-3 py-2 shadow-xl backdrop-blur md:block [animation-delay:-2s]">
        <p className="text-lg font-semibold tracking-tight">-72%</p>
        <p className="text-[11px] text-muted-foreground">first response time</p>
      </div>
      <div className="mk-float absolute -right-4 bottom-10 hidden rounded-xl border border-border/70 bg-card/95 px-3 py-2 shadow-xl backdrop-blur md:block [animation-delay:-4s]">
        <p className="text-lg font-semibold tracking-tight">68%</p>
        <p className="text-[11px] text-muted-foreground">auto-resolved by AI</p>
      </div>
    </div>
  );
}
