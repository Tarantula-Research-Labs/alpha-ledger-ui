"use client";

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import a from "./ask.module.css";

// Gemini sometimes writes maths as \( ... \) and \[ ... \] although it is asked for $ ... $ and $$ ... $$, and a one-line $$ ... $$
// would show inline. Turn all of that into the forms that render: $ ... $ inline, and $$ on its own lines for a displayed equation.
const dollars = (t: string) =>
  t
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m: string) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m: string) => `$${m.trim()}$`)
    .replace(/^[ \t]*\$\$([^\n$]+?)\$\$[ \t]*$/gm, (_, m: string) => `$$\n${m.trim()}\n$$`);

// An answer as formatted text: Markdown (with tables) and LaTeX maths. Raw HTML inside the text is not run.
// This file is loaded the first time an answer is shown, because KaTeX is big.
export function AskMarkdown({ text }: { text: string }) {
  return (
    <div className={a.md}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {dollars(text)}
      </ReactMarkdown>
    </div>
  );
}
