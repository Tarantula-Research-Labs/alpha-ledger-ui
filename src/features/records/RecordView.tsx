"use client";

// A record shown formatted, without the editor (cards in the grid and the read view).
import { generateHTML } from "@tiptap/core";
import { useMemo } from "react";
import { EXTENSIONS } from "./extensions";
import r from "./records.module.css";

export function RecordView({ content, className }: { content: Record<string, unknown>; className?: string }) {
  const html = useMemo(() => {
    try {
      return generateHTML(content as Parameters<typeof generateHTML>[0], EXTENSIONS);
    } catch {
      return "<p>This note couldn't be shown.</p>";
    }
  }, [content]);
  // HTML built from the editor's own document format (no scripts possible); checkboxes are display-only here.
  return <div className={`${r.prose} ${r.readOnly} ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
