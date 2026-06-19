"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  /** Optional label shown in the top bar (e.g. a filename or language). */
  label?: string;
  className?: string;
}

/**
 * Copy-to-clipboard code block used on the install page for the embed snippet.
 */
export function CodeBlock({ code, label, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — fail silently.
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-[oklch(0.18_0_0)] text-left shadow-lg",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          {label ? (
            <span className="ml-3 font-mono text-xs text-white/50">{label}</span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-7 gap-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
