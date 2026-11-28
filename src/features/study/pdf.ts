"use client";

// pdf.js, loaded only when a PDF is opened (it is big). The "legacy" build also runs on older iPads and phones.
// Its helper files (fonts for PDFs that don't embed them, character maps, image decoders) are fetched from
// the same release on a CDN only if a PDF needs them.
export type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

export const assetBase = (version: string) => `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/`;
