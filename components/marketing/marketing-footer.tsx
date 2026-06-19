import Link from "next/link";
import { LifeBuoy } from "lucide-react";

const columns: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Install the widget", href: "/install" },
        { label: "Dashboard", href: "/dashboard" },
      ],
    },
    {
      heading: "Use cases",
      links: [
        { label: "Shared inbox", href: "/#features" },
        { label: "Knowledge base", href: "/#features" },
        { label: "AI answers", href: "/#features" },
        { label: "Seat-based billing", href: "/pricing" },
      ],
    },
    {
      heading: "Get started",
      links: [
        { label: "Create account", href: "/sign-up" },
        { label: "Sign in", href: "/sign-in" },
        { label: "Add to your site", href: "/install" },
      ],
    },
  ];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LifeBuoy className="size-4" />
              </span>
              <span className="text-base font-semibold tracking-tight">
                Zencom
              </span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              The multi-tenant support platform: a real-time shared inbox,
              AI-powered answers, and a self-serve knowledge base — in one
              workspace.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-foreground">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Zencom. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/install"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Install
            </Link>
            <Link
              href="/sign-up"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
