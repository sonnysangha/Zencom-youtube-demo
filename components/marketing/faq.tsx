"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Accessible single-open accordion for FAQ sections. Self-contained (no Radix
 * accordion dependency required) and reused across marketing pages.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/70 bg-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="text-sm font-medium sm:text-base">
                {item.question}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid overflow-hidden px-6 transition-all duration-300 ease-out",
                isOpen
                  ? "grid-rows-[1fr] pb-5 opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
