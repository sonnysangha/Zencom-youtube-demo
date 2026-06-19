"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeft, LifeBuoy } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/knowledge/markdown";

/**
 * Public single-article reader. Resolves the published article by
 * (publicKey, slug); unpublished or unknown slugs render a not-found state.
 */
export function ArticleReader({
  publicKey,
  slug,
}: {
  publicKey: string;
  slug: string;
}) {
  const article = useQuery(api.help.getPublishedBySlug, { publicKey, slug });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/help/${publicKey}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to help center
        </Link>

        {article === undefined ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : article === null ? (
          <div className="mt-20 flex flex-col items-center gap-2 text-center">
            <LifeBuoy className="size-10 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Article not found</h1>
            <p className="text-sm text-muted-foreground">
              This article may have been unpublished or moved.
            </p>
          </div>
        ) : (
          <article className="mt-8">
            <Badge variant="secondary" className="mb-3">
              {article.category}
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight">
              {article.title}
            </h1>
            {article.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.coverImage}
                alt=""
                className="mt-6 w-full rounded-lg border border-border object-cover"
              />
            )}
            <div className="mt-6">
              <Markdown>{article.markdown}</Markdown>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
