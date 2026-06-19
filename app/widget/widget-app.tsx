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
import { Send, Sparkles } from "lucide-react";
// ===== PHASE 7: Agent streaming hooks for the live AI answer. =====
import {
  useThreadMessages,
  useSmoothText,
  toUIMessages,
} from "@convex-dev/agent/react";
// ===== END PHASE 7 =====

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const TOKEN_KEY = "zencom_visitor_token";
const HEARTBEAT_MS = 5000;

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

  const [token] = useState(getOrCreateToken);
  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [draft, setDraft] = useState("");
  const [initError, setInitError] = useState<string | null>(null);

  const initSession = useMutation(api.widget.initSession);
  const startConversation = useMutation(api.widget.startConversation);
  const sendVisitorMessage = useMutation(api.widget.sendVisitorMessage);
  const heartbeat = useMutation(api.widget.heartbeat);

  const [workspaceName, setWorkspaceName] = useState<string>("Support");

  // Bootstrap: init the visitor session, then start/find a conversation.
  useEffect(() => {
    if (!publicKey || !token) return;
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
  }, [publicKey, token, initSession, startConversation]);

  const messagesResult = useQuery(
    api.widget.listMessages,
    conversationId
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
    conversationId ? { publicKey, token, conversationId } : "skip",
  );

  // ===== PHASE 7: AI status + live streaming of the AI answer. =====
  // `aiStatus` tells us whether AI is enabled (vs human takeover) and the Agent
  // threadId to stream from. `useThreadMessages` streams the in-flight answer
  // token-by-token; we only render the message while it is actively streaming —
  // the finished answer is persisted as an authorType "ai" row in `messages`.
  const aiStatus = useQuery(
    api.widget.aiStatus,
    conversationId ? { publicKey, token, conversationId } : "skip",
  );

  const aiThread = useThreadMessages(
    api.widget.listAiThread,
    conversationId && aiStatus?.threadId
      ? { publicKey, token, conversationId, threadId: aiStatus.threadId }
      : "skip",
    { initialNumItems: 20, stream: true },
  );

  // The single currently-streaming assistant message (if any).
  const streamingAi = useMemo(() => {
    const ui = toUIMessages(aiThread.results ?? []);
    const last = ui[ui.length - 1];
    if (
      last &&
      last.role === "assistant" &&
      last.status === "streaming" &&
      (last.text ?? "").trim().length > 0
    ) {
      return last.text ?? "";
    }
    return null;
  }, [aiThread.results]);
  // ===== END PHASE 7 =====

  // Newest-first from the server → reverse for chronological display.
  const messages = useMemo(() => {
    if (!messagesResult) return [];
    return [...messagesResult.page].reverse();
  }, [messagesResult]);

  // ===== PHASE 7: show a "thinking" indicator after a visitor message while
  // the AI is enabled and hasn't produced an answer bubble yet. =====
  const aiThinking = useMemo(() => {
    if (!aiStatus?.aiEnabled) return false;
    if (streamingAi) return false; // already streaming visible text
    const last = messages[messages.length - 1];
    return last?.authorType === "visitor";
  }, [aiStatus?.aiEnabled, streamingAi, messages]);
  // ===== END PHASE 7 =====

  // Presence heartbeat while the widget is mounted.
  useEffect(() => {
    if (!conversationId || !publicKey || !token) return;
    const ping = (typing: boolean) =>
      heartbeat({ publicKey, token, conversationId, typing }).catch(() => {});
    ping(false);
    const interval = setInterval(() => ping(false), HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [conversationId, publicKey, token, heartbeat]);

  // Typing heartbeat: pulse "typing" while the visitor edits the draft.
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTyping = useCallback(() => {
    if (!conversationId || !publicKey || !token) return;
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
  }, [conversationId, publicKey, token, heartbeat]);

  // Auto-scroll to newest message.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activity?.agentTyping, streamingAi, aiThinking]);

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

  if (!publicKey) {
    return (
      <Shell title="Support">
        <CenteredNote text="Missing workspace key." />
      </Shell>
    );
  }

  if (initError) {
    return (
      <Shell title="Support">
        <CenteredNote text={initError} />
      </Shell>
    );
  }

  return (
    <Shell title={workspaceName} agentOnline={activity?.agentOnline ?? false}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2"
      >
        {conversationId === undefined || messagesResult === undefined ? (
          <CenteredNote text="Loading…" />
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center px-4">
            <p className="text-sm font-medium text-zinc-200">
              Hi there 👋
            </p>
            <p className="text-sm text-zinc-400">
              Send us a message and we&apos;ll get right back to you.
            </p>
          </div>
        ) : (
          messages.map((m) =>
            m.authorType === "ai" ? (
              // ===== PHASE 7: persisted AI answer + citations. =====
              <AiBubble key={m._id} body={m.body} sources={m.sources} />
            ) : (
              <Bubble key={m._id} mine={m.authorType === "visitor"}>
                {m.body}
              </Bubble>
            ),
          )
        )}
        {/* ===== PHASE 7: live streaming AI answer (token-by-token). ===== */}
        {streamingAi && <StreamingAiBubble text={streamingAi} />}
        {aiThinking && <AiThinkingBubble />}
        {/* ===== END PHASE 7 ===== */}
        {activity?.agentTyping && <TypingBubble />}
      </div>

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
          className="flex-1 resize-none rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-400 max-h-28"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !conversationId}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Send className="size-4" />
        </button>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  agentOnline,
  children,
}: {
  title: string;
  agentOnline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-900 text-zinc-100">
      <header className="flex items-center justify-between bg-indigo-600 px-4 py-3 text-white">
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{title}</span>
          <span className="flex items-center gap-1.5 text-xs text-indigo-100">
            <span
              className={`inline-block size-2 rounded-full ${
                agentOnline ? "bg-emerald-400" : "bg-indigo-300/60"
              }`}
            />
            {agentOnline ? "Online" : "We reply as soon as we can"}
          </span>
        </div>
        <button
          type="button"
          aria-label="Close chat"
          onClick={() => window.parent?.postMessage({ type: "zencom:close" }, "*")}
          className="rounded-md p-1 text-indigo-100 transition hover:bg-white/10 hover:text-white"
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
  children,
}: {
  mine: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
          mine
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

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

// ===========================================================================
// ===== PHASE 7: AI answer rendering (persisted + live stream + thinking) ====
// ===========================================================================

type Source = { entryId: string; title?: string; score: number };

/** A finished, persisted AI answer with its source citations. */
function AiBubble({ body, sources }: { body: string; sources?: Source[] }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[78%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-indigo-500/40 bg-zinc-800 px-3 py-2 text-sm text-zinc-100">
        <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-indigo-300">
          <Sparkles className="size-3" />
          AI assistant
        </span>
        {body}
      </div>
      <Citations sources={sources} />
    </div>
  );
}

/** The AI answer as it streams in, smoothed token-by-token. */
function StreamingAiBubble({ text }: { text: string }) {
  const [smooth] = useSmoothText(text, { startStreaming: true });
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[78%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-indigo-500/40 bg-zinc-800 px-3 py-2 text-sm text-zinc-100">
        <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-indigo-300">
          <Sparkles className="size-3 animate-pulse" />
          AI assistant
        </span>
        {smooth}
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-300 align-middle" />
      </div>
    </div>
  );
}

/** Placeholder while the AI is retrieving + composing an answer. */
function AiThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-indigo-500/40 bg-zinc-800 px-3 py-2.5 text-xs text-indigo-200">
        <Sparkles className="size-3.5 animate-pulse" />
        <span className="flex items-center gap-1">
          Thinking
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
      </div>
    </div>
  );
}

/** Cited source chips beneath an AI answer. */
function Citations({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="flex max-w-[90%] flex-wrap items-center gap-1 pl-1">
      <span className="text-[10px] font-medium text-zinc-500">Sources:</span>
      {sources.map((s) => (
        <span
          key={s.entryId}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-700/70 px-2 py-0.5 text-[10px] text-zinc-200"
        >
          {s.title ?? "Untitled"}
        </span>
      ))}
    </div>
  );
}
// ===== END PHASE 7 =====
