"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/knowledge/markdown";

interface ArticleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, edit mode; otherwise create mode. */
  article?: Doc<"articles"> | null;
}

export function ArticleEditor({
  open,
  onOpenChange,
  article,
}: ArticleEditorProps) {
  const createArticle = useMutation(api.knowledge.createArticle);
  const updateArticle = useMutation(api.knowledge.updateArticle);

  const [title, setTitle] = useState(article?.title ?? "");
  const [category, setCategory] = useState(article?.category ?? "General");
  const [markdown, setMarkdown] = useState(article?.markdown ?? "");
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? "");
  const [popular, setPopular] = useState(article?.popular ?? false);
  const [published, setPublished] = useState(article?.published ?? false);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(article);

  async function handleSave() {
    if (title.trim().length === 0) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && article) {
        await updateArticle({
          articleId: article._id as Id<"articles">,
          title: title.trim(),
          category: category.trim() || "General",
          markdown,
          coverImage: coverImage.trim() || undefined,
          popular,
          published,
        });
        toast.success("Article updated");
      } else {
        await createArticle({
          title: title.trim(),
          category: category.trim() || "General",
          markdown,
          coverImage: coverImage.trim() || undefined,
          popular,
          published,
        });
        toast.success("Article created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save article",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit article" : "New article"}</DialogTitle>
          <DialogDescription>
            Help-center content. Published articles appear in your public help
            center.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="article-title">Title</Label>
            <Input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How to reset your password"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="article-category">Category</Label>
              <Input
                id="article-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Account"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="article-cover">Cover image URL (optional)</Label>
              <Input
                id="article-cover"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Content</Label>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Write your article in markdown…"
                  className="min-h-[280px] font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[280px] rounded-md border border-border bg-card p-4">
                  {markdown.trim().length > 0 ? (
                    <Markdown>{markdown}</Markdown>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Switch
                id="article-published"
                checked={published}
                onCheckedChange={setPublished}
              />
              <Label htmlFor="article-published">Published</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="article-popular"
                checked={popular}
                onCheckedChange={setPopular}
              />
              <Label htmlFor="article-popular">Mark as popular</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
