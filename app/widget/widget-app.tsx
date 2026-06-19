"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const TOKEN_KEY = "zencom_visitor_token";
const HEARTBEAT_MS = 5000;

// ===== PHASE 4: widget config defaults (mirrors convex/lib/widgetConfig.ts) =====
type LauncherPosition = "bottom-right" | "bottom-left";
type FaqEntry = { question: string; answer: string };
type WidgetConfig = {
  primaryColor: string;
  radius: number;
  marginX: number;
  marginY: number;
  title: string;
  logoUrl?: string;
  launcherPosition: LauncherPosition;
  soundEnabled: boolean;
  proactiveEnabled: boolean;
  proactiveDelaySeconds: number;
  proactiveMessage: string;
  leadCaptureEnabled: boolean;
  leadRequireName: boolean;
  leadRequireEmail: boolean;
  leadRequirePhone: boolean;
  faq: FaqEntry[];
};

const DEFAULT_CONFIG: WidgetConfig = {
  primaryColor: "#4f46e5",
  radius: 16,
  marginX: 20,
  marginY: 20,
  title: "Support",
  launcherPosition: "bottom-right",
  soundEnabled: true,
  proactiveEnabled: false,
  proactiveDelaySeconds: 8,
  proactiveMessage: "👋 Have a question? We're here to help.",
  leadCaptureEnabled: false,
  leadRequireName: true,
  leadRequireEmail: true,
  leadRequirePhone: false,
  faq: [],
};
const LEAD_DONE_KEY = "zencom_lead_captured";
// ===== END PHASE 4 =====

function getOrCreateToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    // localStorage blocked (e.g. strict iframe) — fall back to a session token.
    return crypto.randomUUID();
  }
}

export function WidgetApp() {
  const searchParams = useSearchParams();
  const publicKey = searchParams.get("key") ?? "";
  // ===== PHASE 4: preview mode (customizer iframe) skips lead gating =====
  const isPreview = searchParams.get("preview") === "1";

  const [token] = useState(getOrCreateToken);
  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [draft, setDraft] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  const initSession = useMutation(api.widget.initSession);
  const startConversation = useMutation(api.widget.startConversation);
  const sendVisitorMessage = useMutation(api.widget.sendVisitorMessage);
  const heartbeat = useMutation(api.widget.heartbeat);
  // ===== PHASE 4: lead capture mutation =====
  const captureLead = useMutation(api.widget.captureLead);

  const [workspaceName, setWorkspaceName] = useState<string>("Support");

  // ===== PHASE 4: load widget config (public, by key) + draft preview config =====
  const remoteConfig = useQuery(
    api.widget.getWidgetConfig,
    publicKey ? { publicKey } : "skip",
  );
  // Draft config pushed from the customizer preview via postMessage. When set,
  // it overrides the persisted config so unsaved changes preview live.
  const [previewConfig, setPreviewConfig] = useState<WidgetConfig | null>(null);

  const config: WidgetConfig = useMemo(() => {
    if (previewConfig) return previewConfig;
    if (remoteConfig?.config) return remoteConfig.config;
    return DEFAULT_CONFIG;
  }, [previewConfig, remoteConfig]);

  // Signal readiness to a parent customizer and listen for draft config pushes.
  useEffect(() => {
    window.parent?.postMessage({ type: "zencom:widget-ready" }, "*");
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "zencom:preview-config" && e.data.config) {
        setPreviewConfig(e.data.config as WidgetConfig);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Lead-capture gate: blocks chat until the visitor submits required fields.
  // Skipped in preview mode and once captured (persisted in localStorage).
  const leadAlreadyDone = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LEAD_DONE_KEY) === "1";
    } catch {
      return false;
    }
  }, []);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const needsLead =
    !isPreview &&
    config.leadCaptureEnabled &&
    !leadAlreadyDone &&
    !leadSubmitted;
  // ===== END PHASE 4 config =====

  // Reflect the resolved workspace name from config when available. Render-phase
  // "adjust state when a dependency changes" (state-tracked, no effect/ref) so
  // it stays lint-clean under the React Compiler rules.
  const [seenWorkspaceName, setSeenWorkspaceName] = useState<string | null>(
    null,
  );
  if (
    remoteConfig?.workspaceName &&
    seenWorkspaceName !== remoteConfig.workspaceName
  ) {
    setSeenWorkspaceName(remoteConfig.workspaceName);
    setWorkspaceName(remoteConfig.workspaceName);
  }

  // ===== PHASE 4: relay appearance/proactive config up to embed.js =====
  // embed.js owns the launcher + iframe chrome on the host page, so it needs
  // the appearance (color/radius/margins/position) + proactive settings. We
  // forward them once resolved (preview mode skips — no host launcher there).
  useEffect(() => {
    if (isPreview) return;
    window.parent?.postMessage(
      {
        type: "zencom:config",
        config: {
          primaryColor: config.primaryColor,
          radius: config.radius,
          marginX: config.marginX,
          marginY: config.marginY,
          launcherPosition: config.launcherPosition,
          proactiveEnabled: config.proactiveEnabled,
          proactiveDelaySeconds: config.proactiveDelaySeconds,
          proactiveMessage: config.proactiveMessage,
        },
      },
      "*",
    );
  }, [config, isPreview]);
  // ===== END PHASE 4 =====

  // Bootstrap: init the visitor session, then start/find a conversation.
  // In preview mode we don't touch the backend session at all.
  useEffect(() => {
    if (!publicKey || !token || isPreview) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await initSession({ publicKey, token });
        if (cancelled) return;
        setWorkspaceName(res.workspaceName);
        const convId = await startConversation({ publicKey, token });
        if (cancelled) return;
        setConversationId(convId);
      } catch (err) {
        if (!cancelled) {
          setInitError(
            err instanceof Error ? err.message : "Unable to start chat",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey, token, initSession, startConversation, isPreview]);

  const messagesResult = useQuery(
    api.widget.listMessages,
    conversationId && !isPreview
      ? {
          publicKey,
          token,
          conversationId,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : "skip",
  );

  const activity = useQuery(
    api.widget.agentActivity,
    conversationId && !isPreview
      ? { publicKey, token, conversationId }
      : "skip",
  );

  // Newest-first from the server → reverse for chronological display.
  const messages = useMemo(() => {
    if (!messagesResult) return [];
    return [...messagesResult.page].reverse();
  }, [messagesResult]);

  // Presence heartbeat while the widget is mounted.
  useEffect(() => {
    if (!conversationId || !publicKey || !token || isPreview) return;
    const ping = (typing: boolean) =>
      heartbeat({ publicKey, token, conversationId, typing }).catch(() => {});
    ping(false);
    const interval = setInterval(() => ping(false), HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [conversationId, publicKey, token, heartbeat, isPreview]);

  // Typing heartbeat: pulse "typing" while the visitor edits the draft.
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTyping = useCallback(() => {
    if (!conversationId || !publicKey || !token || isPreview) return;
    heartbeat({ publicKey, token, conversationId, typing: true }).catch(
      () => {},
    );
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (conversationId) {
        heartbeat({
          publicKey,
          token,
          conversationId,
          typing: false,
        }).catch(() => {});
      }
    }, 3000);
  }, [conversationId, publicKey, token, heartbeat, isPreview]);

  // Auto-scroll to newest message.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activity?.agentTyping]);

  // ===== PHASE 4: notification sound on new agent message =====
  const lastAgentCount = useRef(0);
  useEffect(() => {
    const agentCount = messages.filter((m) => m.authorType === "agent").length;
    if (
      config.soundEnabled &&
      agentCount > lastAgentCount.current &&
      lastAgentCount.current !== 0
    ) {
      playChime();
    }
    lastAgentCount.current = agentCount;
  }, [messages, config.soundEnabled]);
  // ===== END PHASE 4 =====

  // Report unread (agent) messages to the parent embed for the launcher badge.
  const reportedUnread = useRef(0);
  useEffect(() => {
    const agentCount = messages.filter(
      (m) => m.authorType === "agent",
    ).length;
    if (agentCount !== reportedUnread.current) {
      reportedUnread.current = agentCount;
      window.parent?.postMessage(
        { type: "zencom:unread", count: agentCount },
        "*",
      );
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || !conversationId) return;
    setDraft("");
    try {
      await sendVisitorMessage({ publicKey, token, conversationId, body });
    } catch {
      // Restore the draft on failure so the visitor can retry.
      setDraft(body);
    }
  }, [draft, conversationId, sendVisitorMessage, publicKey, token]);

  // ===== PHASE 4: submit the lead-capture form =====
  const handleLeadSubmit = useCallback(
    async (lead: { name: string; email: string; phone: string }) => {
      try {
        await captureLead({
          publicKey,
          token,
          name: lead.name,
          email: lead.email,
          phone: lead.phone || undefined,
          conversationId: conversationId ?? undefined,
        });
        try {
          window.localStorage.setItem(LEAD_DONE_KEY, "1");
        } catch {
          /* ignore */
        }
        setLeadSubmitted(true);
      } catch {
        // Surface a soft error via the form (handled in LeadForm).
        throw new Error("Could not submit. Please try again.");
      }
    },
    [captureLead, publicKey, token, conversationId],
  );
  // ===== END PHASE 4 =====

  // Apply the configured accent color to the shell via a CSS variable.
  const accentStyle = useMemo(
    () =>
      ({
        ["--zc-accent" as string]: config.primaryColor,
      }) as React.CSSProperties,
    [config.primaryColor],
  );

  if (!publicKey) {
    return (
      <Shell title="Support" accentStyle={accentStyle}>
        <CenteredNote text="Missing workspace key." />
      </Shell>
    );
  }

  if (initError) {
    return (
      <Shell title={config.title} accentStyle={accentStyle}>
        <CenteredNote text={initError} />
      </Shell>
    );
  }

  return (
    <Shell
      title={config.title || workspaceName}
      logoUrl={config.logoUrl}
      agentOnline={activity?.agentOnline ?? false}
      accentStyle={accentStyle}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
      >
        {/* ===== PHASE 4: lead-capture gate ===== */}
        {needsLead ? (
          <LeadForm config={config} onSubmit={handleLeadSubmit} />
        ) : (
          <>
            {/* ===== PHASE 4: FAQ surfaced above the conversation ===== */}
            {config.faq.length > 0 && messages.length === 0 && (
              <FaqList faq={config.faq} accent={config.primaryColor} />
            )}
            {isPreview ? (
              <PreviewMessages title={config.title} accent={config.primaryColor} />
            ) : conversationId === null || messagesResult === undefined ? (
              <CenteredNote text="Loading…" />
            ) : messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center px-4">
                <p className="text-sm font-medium text-zinc-200">Hi there 👋</p>
                <p className="text-sm text-zinc-400">
                  Send us a message and we&apos;ll get right back to you.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <Bubble
                  key={m._id}
                  mine={m.authorType === "visitor"}
                  accent={config.primaryColor}
                >
                  {m.body}
                </Bubble>
              ))
            )}
            {activity?.agentTyping && <TypingBubble />}
          </>
        )}
      </div>

      {!needsLead && (
        <form
          className="border-t border-zinc-700 p-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              signalTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Type a message…"
            disabled={isPreview}
            className="flex-1 resize-none rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[var(--zc-accent)] max-h-28"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !conversationId || isPreview}
            aria-label="Send message"
            style={{ background: "var(--zc-accent)" }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="size-4" />
          </button>
        </form>
      )}
    </Shell>
  );
}

function Shell({
  title,
  logoUrl,
  agentOnline,
  accentStyle,
  children,
}: {
  title: string;
  logoUrl?: string;
  agentOnline?: boolean;
  accentStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={accentStyle}
      className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-900 text-zinc-100"
    >
      <header
        style={{ background: "var(--zc-accent)" }}
        className="flex items-center justify-between px-4 py-3 text-white"
      >
        <div className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-7 rounded-full bg-white/20 object-cover"
            />
          ) : null}
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{title}</span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <span
                className={`inline-block size-2 rounded-full ${
                  agentOnline ? "bg-emerald-400" : "bg-white/50"
                }`}
              />
              {agentOnline ? "Online" : "We reply as soon as we can"}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close chat"
          onClick={() => window.parent?.postMessage({ type: "zencom:close" }, "*")}
          className="rounded-md p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>
      {children}
    </div>
  );
}

function Bubble({
  mine,
  accent,
  children,
}: {
  mine: boolean;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        style={mine ? { background: accent } : undefined}
        className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
          mine
            ? "text-white rounded-br-sm"
            : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ===== PHASE 4: lead-capture form =====
function LeadForm({
  config,
  onSubmit,
}: {
  config: WidgetConfig;
  onSubmit: (lead: {
    name: string;
    email: string;
    phone: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (config.leadRequireName && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (config.leadRequireEmail && !email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (config.leadRequirePhone && !phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[var(--zc-accent)]";

  return (
    <form onSubmit={handle} className="flex flex-1 flex-col gap-3 px-1 py-2">
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-100">
          Let&apos;s get you connected
        </p>
        <p className="text-xs text-zinc-400">
          Share a few details so we can follow up.
        </p>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Name${config.leadRequireName ? "" : " (optional)"}`}
        className={inputCls}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={`Email${config.leadRequireEmail ? "" : " (optional)"}`}
        className={inputCls}
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={`Phone${config.leadRequirePhone ? "" : " (optional)"}`}
        className={inputCls}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        style={{ background: "var(--zc-accent)" }}
        className="mt-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start chat"}
      </button>
    </form>
  );
}

function FaqList({ faq, accent }: { faq: FaqEntry[]; accent: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Common questions
      </p>
      {faq.map((entry, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/60"
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-100"
          >
            <span>{entry.question}</span>
            <span style={{ color: accent }} className="text-lg leading-none">
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && (
            <p className="border-t border-zinc-700 px-3 py-2 text-xs text-zinc-300">
              {entry.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// In the customizer preview we show a couple of sample bubbles (no backend).
function PreviewMessages({ title, accent }: { title: string; accent: string }) {
  return (
    <>
      <Bubble mine={false} accent={accent}>
        Hi! This is a live preview of your {title} widget.
      </Bubble>
      <Bubble mine accent={accent}>
        Looks great — love the colors!
      </Bubble>
    </>
  );
}
// ===== END PHASE 4 =====

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-3">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-zinc-400"
      style={{ animationDelay: delay }}
    />
  );
}

function CenteredNote({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-zinc-400">{text}</p>
    </div>
  );
}

// ===== PHASE 4: tiny WebAudio chime (no asset dependency) =====
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    /* audio not available — ignore */
  }
}
// ===== END PHASE 4 =====
