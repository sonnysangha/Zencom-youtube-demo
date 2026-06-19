"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, LifeBuoy, Search, Star } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Public help-center index for one workspace, resolved entirely by `publicKey`.
 * No auth, no orgId from the client — the Convex query derives tenancy from the
 * key and only ever returns published articles.
 */
export function HelpCenter({ publicKey }: { publicKey: string }) {
  const [search, setSearch] = useState("");
  const workspace = useQuery(api.help.workspaceInfo, { publicKey });
  const articles = useQuery(api.help.listPublished, {
    publicKey,
    search: search.trim() || undefined,
  });

  const grouped = groupByCategory(articles ?? []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <LifeBuoy className="size-4" />
            {workspace === undefined ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span>{workspace?.name ?? "Help center"}</span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            How can we help?
          </h1>
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="h-11 pl-10"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {articles === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : workspace === null ? (
          <EmptyHelp message="This help center is not available." />
        ) : articles.length === 0 ? (
          <EmptyHelp
            message={
              search.trim()
                ? `No articles match “${search.trim()}”.`
                : "No published articles yet."
            }
          />
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h2>
                <div className="grid gap-3">
                  {items.map((article) => (
                    <Link
                      key={article._id}
                      href={`/help/${publicKey}/${article.slug}`}
                    >
                      <Card className="transition-colors hover:border-sky-500/50 hover:bg-accent">
                        <CardContent className="flex items-center justify-between gap-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{article.title}</span>
                            {article.popular && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="size-3" />
                                Popular
                              </Badge>
                            )}
                          </div>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

type Article = {
  _id: string;
  _creationTime: number;
  title: string;
  slug: string;
  category: string;
  coverImage?: string;
  popular: boolean;
};

function groupByCategory(articles: Article[]): Record<string, Article[]> {
  const groups: Record<string, Article[]> = {};
  for (const article of articles) {
    const key = article.category || "General";
    (groups[key] ??= []).push(article);
  }
  return groups;
}

function EmptyHelp({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center">
      <LifeBuoy className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
