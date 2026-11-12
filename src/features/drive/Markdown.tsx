"use client";

import ReactMarkdown from "react-markdown";
import d from "./drive.module.css";

// Markdown shown as formatted text. Raw HTML inside the text is not run.
export function Markdown({ text }: { text: string }) {
  return (
    <div className={d.md}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
