import { ArticleReader } from "@/components/help/article-reader";

/**
 * Phase 3 — Public single-article reader. Unauthenticated; resolves the
 * published article by (publicKey, slug) via Convex.
 */
export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ publicKey: string; slug: string }>;
}) {
  const { publicKey, slug } = await params;
  return <ArticleReader publicKey={publicKey} slug={slug} />;
}
