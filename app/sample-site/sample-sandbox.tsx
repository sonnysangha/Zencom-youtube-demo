"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Sandbox chrome for the sample website. Two jobs:
 *
 *  1. Embed the real Zencom widget exactly the way a customer's site does —
 *     by injecting `/embed.js` with a `data-zencom-key` attribute read from
 *     the `?key=` query param. The loader (public/embed.js) resolves the key
 *     from `document.currentScript`, and we append the script last so its
 *     last-`<script>` fallback also lands on us.
 *  2. Render a dismissible banner so this page is never mistaken for a real
 *     product — it's a preview harness for testing the widget.
 */
export function SampleSandbox() {
  const [showBanner, setShowBanner] = useState(true);
  // Read the key once during render (client-only). The server assumes a key is
  // present so first paint is stable; the banner text below is
  // hydration-suppressed in case the client disagrees on a keyless visit.
  const [hasKey] = useState(() =>
    typeof window === "undefined"
      ? true
      : new URLSearchParams(window.location.search).has("key"),
  );
  const injected = useRef(false);

  useEffect(() => {
    // Guard against double-injection (React StrictMode remounts in dev).
    if (injected.current) return;
    injected.current = true;

    const key = new URLSearchParams(window.location.search).get("key");
    if (!key) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "/embed.js";
    script.setAttribute("data-zencom-key", key);
    document.body.appendChild(script);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[2147483646] flex -translate-x-1/2 items-center gap-3 rounded-full border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-xs text-zinc-100 shadow-lg backdrop-blur">
      <span aria-hidden>🧩</span>
      <span suppressHydrationWarning>
        {hasKey
          ? "Zencom preview — this is a sample site to test your widget."
          : "No widget key provided. Open this page from your dashboard's Install tab."}
      </span>
      <button
        type="button"
        onClick={() => setShowBanner(false)}
        aria-label="Dismiss"
        className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
