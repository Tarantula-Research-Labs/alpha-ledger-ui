"use client";

import { useState } from "react";
import { CodeBlock } from "@/core/ui";
import a from "./steps.module.css";

export interface CodeStep {
  title: string;
  text: string;
  code: string;
  /** Imports shown on the right; null shows `noImports` instead. */
  imports: string | null;
  noImports?: string;
}

// Notebook steps as an accordion: one open at a time; an open step shows its code on the left and its imports on the right.
export function CodeSteps({ steps }: { steps: CodeStep[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={a.list}>
      {steps.map((st, i) => {
        const isOpen = open === i;
        return (
          <section key={st.title} className={a.item} data-open={isOpen}>
            <button type="button" className={a.head} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <span className={a.num}>{i + 1}</span>
              <span className={a.headText}>
                <strong className={a.title}>{st.title}</strong>
                <span className={a.desc}>{st.text}</span>
              </span>
              <span className={a.chev} aria-hidden="true">
                ›
              </span>
            </button>
            {isOpen && (
              <div className={a.body}>
                <div className={a.main}>
                  <CodeBlock code={st.code} />
                </div>
                <div className={a.side}>
                  {st.imports ? <CodeBlock code={st.imports} label="Imports" /> : <p className={a.none}>{st.noImports ?? "No imports needed."}</p>}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
