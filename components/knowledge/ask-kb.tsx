"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  useThreadMessages,
  useSmoothText,
  toUIMessages,
} from "@convex-dev/agent/react";
import { Send, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/knowledge/markdown";

interface Source {
  entryId: string;
  title?: string;
  score: number;
}

/**
 * Standalone "Ask KB" surface. Validates RAG end-to-end: a workspace question
 * retrieves context from the org's RAG namespace and a gpt-4o-mini answer is
 * streamed token-by-token (via the Agent component's delta streaming over
 * websockets) with source citations.
 */
export function AskKb() {
  const createThread = useMutation(api.askKb.createThread);
  const ask = useAction(api.askKb.ask);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  // Sources per assistant turn, keyed by the order in which questions are asked.
  const [sourcesByTurn, setSourcesByTurn] = useState<Record<number, Source[]>>(
    {},
  );

  // Create a thread on first mount.
  useEffect(() => {
    let cancelled = false;
    void createThread({})
      .then((res) => {
        if (!cancelled) setThreadId(res.threadId);
      })
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : "Could not start Ask KB session",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [createThread]);

  const messages = useThreadMessages(
    api.askKb.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true },
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || !threadId || pending) return;

    setInput("");
    setPending(true);
    const turnIndex = uiMessages.length;
    try {
      const { sources } = await ask({ threadId, prompt: question });
      setSourcesByTurn((prev) => ({ ...prev, [turnIndex]: sources }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setPending(false);
    }
  }

  const uiMessages = toUIMessages(messages.results ?? []);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-3xl flex-col">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="size-6 text-sky-600 dark:text-sky-400" />
          Ask the knowledge base
        </h1>
        <p className="text-sm text-muted-foreground">
          Test RAG retrieval against your workspace docs. Answers stream live and
          cite their sources.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-card/40 p-4">
        {uiMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ask a question about your knowledge base to see a cited, streaming
              answer.
            </p>
          </div>
        ) : (
          uiMessages.map((message, idx) => (
            <MessageBubble
              key={message.key}
              role={message.role === "user" ? "user" : "assistant"}
              text={message.text ?? ""}
              streaming={message.status === "streaming"}
              sources={
                message.role === "assistant"
                  ? sourcesByTurn[idx] ?? sourcesByTurn[idx - 1]
                  : undefined
              }
            />
          ))
        )}
        {pending &&
          uiMessages[uiMessages.length - 1]?.role !== "assistant" && (
            <p className="text-sm text-muted-foreground">Thinking…</p>
          )}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            threadId ? "Ask a question…" : "Starting session…"
          }
          disabled={!threadId || pending}
        />
        <Button type="submit" disabled={!threadId || pending || !input.trim()}>
          <Send className="size-4" />
          Ask
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  role,
  text,
  streaming,
  sources,
}: {
  role: "user" | "assistant";
  text: string;
  streaming: boolean;
  sources?: Source[];
}) {
  const [smoothText] = useSmoothText(text, { startStreaming: streaming });
  const display = role === "assistant" ? smoothText : text;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [display]);

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-600 px-4 py-2 text-sm text-white">
          {text}
        </div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardContent className="py-3">
          {display.trim().length > 0 ? (
            <Markdown>{display}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Generating answer…</p>
          )}
        </CardContent>
      </Card>
      {sources && sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-1">
          <span className="text-xs font-medium text-muted-foreground">
            Sources:
          </span>
          {sources.map((s) => (
            <Badge key={s.entryId} variant="secondary" className="gap-1">
              <FileText className="size-3" />
              {s.title ?? "Untitled"}
              <span className="text-muted-foreground">
                {(s.score * 100).toFixed(0)}%
              </span>
            </Badge>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
