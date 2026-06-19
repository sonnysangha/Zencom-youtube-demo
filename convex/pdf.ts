"use node";

import { v } from "convex/values";
import { extractText, getDocumentProxy } from "unpdf";
import { internalAction } from "./_generated/server";

/**
 * Phase 3 — PDF text extraction.
 *
 * Isolated in its own `"use node"` file: a `"use node"` file may NOT export
 * queries/mutations. Everything else in the ingestion pipeline lives in the
 * default runtime (`convex/ingest.ts`) and dispatches here only for PDFs.
 *
 * Uses `unpdf` (a serverless-safe pdfjs build) so it runs in the Convex Node
 * runtime without the DOM/canvas polyfills that the stock pdfjs requires.
 *
 * Internal-only: invoked via `ctx.runAction(internal.pdf.extractPdfText, ...)`.
 */
export const extractPdfText = internalAction({
  args: { storageId: v.id("_storage") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.storageId);
    if (blob === null) {
      throw new Error("PDF not found in storage");
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    // mergePages: true returns the whole document as a single string.
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  },
});
