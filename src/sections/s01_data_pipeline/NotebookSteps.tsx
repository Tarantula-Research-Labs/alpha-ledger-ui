"use client";

import { useState } from "react";
import { CodeBlock } from "@/core/ui";
import {
  dbConnectImportsSnippet,
  dbConnectSnippet,
  loadMarketDataSnippet,
  pushPipelineFileSnippet,
  pushPipelineImportsSnippet,
  retrievePipelineFileSnippet,
  retrievePipelineImportsSnippet,
} from "@/features/snippets/snippets";
import a from "./steps.module.css";

interface Step {
  title: string;
  text: string;
  code: string;
  imports: string | null;
}

function steps(experiment: string): Step[] {
  return [
    {
      title: "Connect to the database",
      text: "Opens a connection to the market data in Postgres. Keep the database credentials in a .env file next to your notebook.",
      code: dbConnectSnippet(),
      imports: dbConnectImportsSnippet(),
    },
    {
      title: "Load the data",
      text: "Reads daily prices for the tickers you list into a DataFrame. Nothing is saved yet.",
      code: loadMarketDataSnippet(),
      imports: null,
    },
    {
      title: "Push your data to S3",
      text: "Saves a DataFrame into this experiment's Data Pipeline folder under the name you give it. The same name again saves a new numbered copy (_v2, _v3, …). Needs LEDGER_API_KEY in the .env.",
      code: pushPipelineFileSnippet(experiment),
      imports: pushPipelineImportsSnippet(),
    },
    {
      title: "Retrieve it",
      text: "Loads a file you pushed back into a DataFrame, in any notebook. Loads the newest copy unless you name a version.",
      code: retrievePipelineFileSnippet(experiment),
      imports: retrievePipelineImportsSnippet(),
    },
  ];
}

// The notebook steps as an accordion: one open at a time; an open step shows its code on the left and its imports on the right.
export function NotebookSteps({ experiment }: { experiment: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={a.list}>
      {steps(experiment).map((st, i) => {
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
                  {st.imports ? (
                    <CodeBlock code={st.imports} label="Imports" />
                  ) : (
                    <p className={a.none}>No imports needed: uses db from step 1.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
