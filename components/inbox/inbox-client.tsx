"use client";

import { useMemo, useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { formatDistanceToNowStrict } from "@/lib/relative-time";
import { CircleDot, Inbox as InboxIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InboxThread } from "@/components/inbox/inbox-thread";

type Filter = "all" | "unread" | "unassigned" | "mine";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "unassigned", label: "Unassigned" },
  { key: "mine", label: "Assigned to me" },
];

export function InboxClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(
    null,
  );

  const counts = useQuery(api.inbox.inboxCounts);

  const {
    results: conversations,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.inbox.listConversations,
    { filter, status: undefined },
    { initialNumItems: 25 },
  );

  return (
    <div className="flex h-full">
      {/* ---- List pane ---- */}
      <aside className="flex w-full max-w-sm shrink-0 flex-col border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-base font-semibold">
              <InboxIcon className="size-4" />
              Inbox
            </h1>
            {counts && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{counts.open} open</span>
                {counts.unread > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5">
                    {counts.unread} new
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {f.label}
                {f.key === "unassigned" && counts && counts.unassigned > 0
                  ? ` (${counts.unassigned})`
                  : ""}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {status === "LoadingFirstPage" ? (
              <ListSkeleton />
            ) : conversations.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No conversations here yet.
              </p>
            ) : (
              conversations.map((c) => (
                <ConversationRow
                  key={c._id}
                  conversation={c}
                  active={c._id === selectedId}
                  onSelect={() => setSelectedId(c._id)}
                />
              ))
            )}
            {status === "CanLoadMore" && (
              <div className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => loadMore(25)}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ---- Thread pane ---- */}
      <section className="flex min-w-0 flex-1 flex-col">
        {selectedId ? (
          <InboxThread conversationId={selectedId} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <InboxIcon className="size-8" />
            <p className="text-sm">Select a conversation to start replying.</p>
          </div>
        )}
      </section>
    </div>
  );
}

type ConversationListItem = NonNullable<
  ReturnType<typeof usePaginatedQuery<typeof api.inbox.listConversations>>
>["results"][number];

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationListItem;
  active: boolean;
  onSelect: () => void;
}) {
  const name =
    conversation.visitorName || conversation.visitorEmail || "Anonymous visitor";
  const initials = useMemo(() => initialsOf(name), [name]);
  const unread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition",
        active ? "bg-muted" : "hover:bg-muted/50",
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatDistanceToNowStrict(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-xs",
              unread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {conversation.lastMessageAuthorType === "agent" ? "You: " : ""}
            {conversation.lastMessagePreview ?? "New conversation"}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {conversation.status === "closed" ? (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              Closed
            </Badge>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
              <CircleDot className="size-2.5" /> Open
            </span>
          )}
          {conversation.assigneeId === undefined &&
            conversation.status === "open" && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                Unassigned
              </Badge>
            )}
        </div>
      </div>
      {unread && (
        <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 border-b border-border px-4 py-3"
        >
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
