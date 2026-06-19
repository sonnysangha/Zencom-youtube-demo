"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, LifeBuoy, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Install", href: "/install" },
];

/**
 * Shared marketing site header. Sticky, translucent, with a scroll-aware
 * border + blur. Auth-aware CTAs via Clerk's async <Show>.
 */
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-center gap-2"
          aria-label="Zencom home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
            <LifeBuoy className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">Zencom</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Show
            when="signed-out"
            fallback={
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          >
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Show>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className="justify-start"
                onClick={() => setOpen(false)}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Show
                when="signed-out"
                fallback={
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/dashboard">
                      Dashboard <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                }
              >
                <Button
                  asChild
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </Show>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
