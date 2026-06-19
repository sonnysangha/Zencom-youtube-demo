"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CircleUser,
  Hand,
  Lock,
  Send,
  Sparkles,
  Unlock,
  UserCheck,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/relative-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HEARTBEAT_MS = 5000;

export function InboxThread({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const { userId } = useAuth();
  const [draft, setDraft] = useState("");

  const detail = useQuery(api.inbox.getConversation, { conversationId });
  const activity = useQuery(api.inbox.conversationActivity, { conversationId });
  const members = useQuery(api.members.list);

  const { results: messagesDesc, status } = usePaginatedQuery(
    api.inbox.listThread,
    { conversationId },
    { initialNumItems: 50 },
  );

  const sendMessage = useMutation(api.inbox.sendAgentMessage);
  const markRead = useMutation(api.inbox.markRead);
  const heartbeat = useMutation(api.inbox.heartbeat);
  const assign = useMutation(api.inbox.assign);
  const setStatus = useMutation(api.inbox.setStatus);
  const takeover = useMutation(api.inbox.takeover);
  // ===== PHASE 7: toggle the AI assistant on/off for this conversation. =====
  const setAiEnabled = useMutation(api.inbox.setAiEnabled);
  // ===== END PHASE 7 =====

  const messages = useMemo(
    () => [...messagesDesc].reverse(),
    [messagesDesc],
  );

  // Mark read whenever the conversation or its unread count changes.
  useEffect(() => {
    if (detail?.conversation && detail.conversation.unreadCount > 0) {
      void markRead({ conversationId });
    }
  }, [
    conversationId,
    detail?.conversation?.unreadCount,
    detail?.conversation,
    markRead,
  ]);

  // Agent presence heartbeat while viewing the thread.
  useEffect(() => {
    const ping = (typing: boolean) =>
      heartbeat({ conversationId, typing }).catch(() => {});
    ping(false);
    const interval = setInterval(() => ping(false), HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [conversationId, heartbeat]);

  // Typing pulse.
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalTyping = useCallback(() => {
    heartbeat({ conversationId, typing: true }).catch(() => {});
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      heartbeat({ conversationId, typing: false }).catch(() => {});
    }, 3000);
  }, [conversationId, heartbeat]);

  // Auto-scroll to newest.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activity?.visitorTyping]);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      await sendMessage({ conversationId, body });
    } catch (err) {
      setDraft(body);
      toast.error(
        err instanceof Error ? err.message : "Failed to send message",
      );
    }
  }, [draft, conversationId, sendMessage]);

  if (detail === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading conversation…
      </div>
    );
  }
  if (detail === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Conversation not found.
      </div>
    );
  }

  const { conversation, visitor } = detail;
  // ===== PHASE 7: AI gate state for this conversation. =====
  const aiEnabled = detail.aiEnabled;
  // ===== END PHASE 7 =====
  const visitorName =
    visitor?.name || visitor?.email || "Anonymous visitor";
  const assignee = members?.find((m) => m.userId === conversation.assigneeId);
  const isMine = conversation.assigneeId === userId;
  const closed = conversation.status === "closed";

  return (
    <div className="flex h-full flex-col">
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs">
              {initialsOf(visitorName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">
                {visitorName}
              </span>
              {activity?.visitorOnline ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  Online
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Offline
                </span>
              )}
            </div>
            {visitor?.email && (
              <p className="truncate text-xs text-muted-foreground">
                {visitor.email}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Assignment */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CircleUser className="size-3.5" />
                {assignee ? assignee.name ?? assignee.email ?? "Assigned" : "Assign"}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Assign to</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void assign({ conversationId, assigneeId: undefined }).then(
                    () => toast.success("Unassigned"),
                  );
                }}
              >
                Unassigned
                {conversation.assigneeId === undefined && (
                  <Check className="ml-auto size-3.5" />
                )}
              </DropdownMenuItem>
              {(members ?? []).map((m) => (
                <DropdownMenuItem
                  key={m.userId}
                  onClick={() => {
                    void assign({
                      conversationId,
                      assigneeId: m.userId,
                    }).then(() =>
                      toast.success(
                        `Assigned to ${m.name ?? m.email ?? "teammate"}`,
                      ),
                    );
                  }}
                >
                  <span className="truncate">
                    {m.name ?? m.email ?? m.userId}
                  </span>
                  {conversation.assigneeId === m.userId && (
                    <Check className="ml-auto size-3.5" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ===== PHASE 7: AI on/off toggle ===== */}
          <Button
            variant={aiEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const next = !aiEnabled;
              void setAiEnabled({ conversationId, enabled: next }).then(() =>
                toast.success(
                  next
                    ? "AI assistant re-enabled"
                    : "AI assistant paused for this conversation",
                ),
              );
            }}
            title={
              aiEnabled
                ? "AI is answering — click to pause and take over"
                : "AI is paused — click to hand back to the assistant"
            }
          >
            <Sparkles className="size-3.5" />
            {aiEnabled ? "AI on" : "AI off"}
          </Button>
          {/* ===== END PHASE 7 ===== */}

          {/* Takeover (assign to me) — PHASE 7: also pauses AI server-side. */}
          {!isMine && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void takeover({ conversationId }).then(() =>
                  toast.success("You took over this conversation"),
                );
              }}
            >
              <Hand className="size-3.5" />
              Take over
            </Button>
          )}
          {isMine && (
            <Badge variant="secondary" className="gap-1">
              <UserCheck className="size-3" />
              Yours
            </Badge>
          )}

          {/* Open / Close */}
          <Button
            variant={closed ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const next = closed ? "open" : "closed";
              void setStatus({ conversationId, status: next }).then(() =>
                toast.success(next === "closed" ? "Closed" : "Reopened"),
              );
            }}
          >
            {closed ? (
              <>
                <Unlock className="size-3.5" /> Reopen
              </>
            ) : (
              <>
                <Lock className="size-3.5" /> Close
              </>
            )}
          </Button>
        </div>
      </header>

      {/* ---- Messages ---- */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-2 px-4 py-4">
          {status === "LoadingFirstPage" ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading messages…
            </p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m._id}
                mine={m.authorType === "agent"}
                isAi={m.authorType === "ai"}
                body={m.body}
                at={m._creationTime}
                sources={m.sources}
                authorLabel={
                  m.authorType === "agent"
                    ? m.authorId === userId
                      ? "You"
                      : agentLabel(members, m.authorId)
                    : m.authorType === "ai"
                      ? "AI assistant"
                      : visitorName
                }
              />
            ))
          )}
          {activity?.visitorTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ---- Composer ---- */}
      <div className="border-t border-border p-3">
        {activity && activity.otherAgentsTyping > 0 && (
          <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">
            Another teammate is typing…
          </p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
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
            rows={2}
            placeholder={
              closed ? "Reopen to reply…" : "Reply to the visitor…"
            }
            className="min-h-[44px] flex-1 resize-none"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!draft.trim()}
            className="h-11"
          >
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  mine,
  isAi,
  body,
  at,
  authorLabel,
  sources,
}: {
  mine: boolean;
  isAi?: boolean;
  body: string;
  at: number;
  authorLabel: string;
  sources?: { entryId: string; title?: string; score: number }[];
}) {
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[72%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
          mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : isAi
              ? "rounded-bl-sm border border-primary/40 bg-muted text-foreground"
              : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {/* ===== PHASE 7: AI label inside the bubble ===== */}
        {isAi && (
          <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" />
            AI assistant
          </span>
        )}
        {body}
      </div>
      {/* ===== PHASE 7: AI source citations ===== */}
      {isAi && sources && sources.length > 0 && (
        <div className="mt-1 flex max-w-[72%] flex-wrap items-center gap-1 px-1">
          <span className="text-[10px] font-medium text-muted-foreground">
            Sources:
          </span>
          {sources.map((s) => (
            <Badge key={s.entryId} variant="secondary" className="gap-1">
              {s.title ?? "Untitled"}
            </Badge>
          ))}
        </div>
      )}
      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
        {authorLabel} · {formatClock(at)}
      </span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}

type Member = { userId: string; name?: string; email?: string };

function agentLabel(
  members: Member[] | undefined,
  authorId: string | undefined,
): string {
  if (!authorId) return "Agent";
  const m = members?.find((x) => x.userId === authorId);
  return m?.name ?? m?.email ?? "Agent";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
