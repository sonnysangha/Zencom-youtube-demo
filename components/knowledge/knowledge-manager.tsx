"use client";

import { useState } from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleEditor } from "@/components/knowledge/article-editor";
import { DocumentUploader } from "@/components/knowledge/document-uploader";

const STATUS_STYLES: Record<
  Doc<"documents">["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  processing: { label: "Processing", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  ready: { label: "Ready", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  error: { label: "Error", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
};

export function KnowledgeManager() {
  const articles = useQuery(api.knowledge.listArticles);
  const workspace = useQuery(api.workspaces.current);
  const documents = usePaginatedQuery(
    api.knowledge.listDocuments,
    {},
    { initialNumItems: 20 },
  );

  const deleteArticle = useMutation(api.knowledge.deleteArticle);
  const deleteDocument = useMutation(api.knowledge.deleteDocument);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"articles"> | null>(null);

  const helpUrl = workspace
    ? `/help/${workspace.publicKey}`
    : null;

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(article: Doc<"articles">) {
    setEditing(article);
    setEditorOpen(true);
  }

  async function handleDeleteArticle(id: Id<"articles">) {
    try {
      await deleteArticle({ articleId: id });
      toast.success("Article deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleDeleteDocument(id: Id<"documents">) {
    try {
      await deleteDocument({ documentId: id });
      toast.success("Document deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Knowledge base
          </h1>
          <p className="text-sm text-muted-foreground">
            Author help-center articles and ingest source documents for AI
            retrieval.
          </p>
        </div>
        {helpUrl && (
          <Button asChild variant="outline">
            <a href={helpUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              View help center
            </a>
          </Button>
        )}
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">
            <BookOpen className="size-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="size-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* ---- Articles ---- */}
        <TabsContent value="articles" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Help-center articles</CardTitle>
              <Button onClick={openCreate} size="sm">
                <Plus className="size-4" />
                New article
              </Button>
            </CardHeader>
            <CardContent>
              {articles === undefined ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : articles.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="size-8 text-muted-foreground" />}
                  title="No articles yet"
                  description="Create your first help-center article to get started."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map((article: Doc<"articles">) => (
                      <TableRow key={article._id}>
                        <TableCell className="font-medium">
                          {article.title}
                          {article.popular && (
                            <Badge variant="secondary" className="ml-2">
                              Popular
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {article.category}
                        </TableCell>
                        <TableCell>
                          {article.published ? (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(article)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteArticle(article._id)}
                          >
                            <Trash2 className="size-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Documents ---- */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Source documents</CardTitle>
              <DocumentUploader />
            </CardHeader>
            <CardContent>
              {documents.status === "LoadingFirstPage" ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : documents.results.length === 0 ? (
                <EmptyState
                  icon={<FileText className="size-8 text-muted-foreground" />}
                  title="No documents yet"
                  description="Upload .md, .txt, or .pdf files to embed them for AI answers."
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Chunks</TableHead>
                        <TableHead className="w-[60px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.results.map((doc: Doc<"documents">) => {
                        const status = STATUS_STYLES[doc.status];
                        return (
                          <TableRow key={doc._id}>
                            <TableCell className="font-medium">
                              {doc.source}
                              {doc.status === "error" && doc.error && (
                                <p className="mt-1 text-xs text-red-600">
                                  {doc.error}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="uppercase text-muted-foreground">
                              {doc.fileType}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {doc.chunkCount ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDocument(doc._id)}
                              >
                                <Trash2 className="size-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {documents.status === "CanLoadMore" && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => documents.loadMore(20)}
                      >
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ArticleEditor
        key={editing?._id ?? "new"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editing}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {icon}
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
