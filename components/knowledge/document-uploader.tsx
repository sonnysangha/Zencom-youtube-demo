"use client";

import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type FileType = "md" | "txt" | "pdf";

function detectFileType(name: string): FileType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".txt")) return "txt";
  return null;
}

/**
 * Uploads a source document (.md / .txt / .pdf) to Convex storage, then kicks
 * off the RAG ingestion action. The `documents` table list updates reactively.
 */
export function DocumentUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.knowledge.generateUploadUrl);
  const processUpload = useAction(api.ingest.processUpload);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileType = detectFileType(file.name);
        if (fileType === null) {
          toast.error(`Unsupported file: ${file.name} (use .md, .txt or .pdf)`);
          continue;
        }

        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!res.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };

        toast.promise(
          processUpload({ storageId, source: file.name, fileType }),
          {
            loading: `Embedding ${file.name}…`,
            success: `${file.name} added to the knowledge base`,
            error: (e) =>
              e instanceof Error ? e.message : `Failed to process ${file.name}`,
          },
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.txt,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        variant="outline"
      >
        <Upload className="size-4" />
        {uploading ? "Uploading…" : "Upload document"}
      </Button>
    </>
  );
}
