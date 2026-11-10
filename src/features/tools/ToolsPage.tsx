"use client";

import { useState, type ReactNode } from "react";
import { CodeBlock, PageHeader, Panel } from "@/core/ui";
import {
  dbConnectImportsSnippet,
  dbConnectSnippet,
  loadMarketDataSnippet,
  walkForwardImportsSnippet,
  walkForwardSnippet,
} from "@/features/snippets/snippets";
import t from "./tools.module.css";

// Transaction costs, as a fraction of the traded amount, charged on each side (buy and sell).
const COST_PER_SIDE = { intraday: 0.0005236, delivery: 0.0011124 };

const costsSnippet = `COST_PER_SIDE = {"intraday": ${COST_PER_SIDE.intraday}, "delivery": ${COST_PER_SIDE.delivery}}  # fraction of traded amount, each side

cost = traded_amount * COST_PER_SIDE["delivery"]  # change: "intraday" or "delivery"
`;

const pct = (x: number, digits = 5) => `${(x * 100).toFixed(digits)}%`;

interface Tool {
  title: string;
  text: string;
  body: ReactNode;
}

function CodeRow({ code, imports, none }: { code: string; imports?: string; none?: string }) {
  return (
    <div className={t.row}>
      <div className={t.main}>
        <CodeBlock code={code} />
      </div>
      <div className={t.side}>{imports ? <CodeBlock code={imports} label="Imports" /> : <p className={t.none}>{none}</p>}</div>
    </div>
  );
}

const TOOLS: Tool[] = [
  {
    title: "OHLCV data",
    text: "Connect to the market data in Postgres and load daily prices for any tickers.",
    body: (
      <>
        <p className={t.text}>
          <strong>1. Connect to the database.</strong> Keep the database credentials in a .env file next to your notebook.
        </p>
        <CodeRow code={dbConnectSnippet()} imports={dbConnectImportsSnippet()} />
        <p className={t.text}>
          <strong>2. Load the data.</strong> Reads daily prices for the tickers you list into a DataFrame.
        </p>
        <CodeRow code={loadMarketDataSnippet()} none="No imports needed: uses db from step 1." />
      </>
    ),
  },
  {
    title: "Transaction costs",
    text: "Cost rates for backtests, as a % of the traded amount, charged on each side.",
    body: (
      <>
        <table className={t.table}>
          <thead>
            <tr>
              <th scope="col">Trade type</th>
              <th scope="col">Rate per side</th>
              <th scope="col">Round trip, as % of the position</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Intraday</th>
              <td>{pct(COST_PER_SIDE.intraday)}</td>
              <td>{pct(COST_PER_SIDE.intraday * 2)}</td>
            </tr>
            <tr>
              <th scope="row">Delivery</th>
              <td>{pct(COST_PER_SIDE.delivery)}</td>
              <td>{pct(COST_PER_SIDE.delivery * 2)}</td>
            </tr>
          </tbody>
        </table>
        <p className={t.text}>
          Apply the rate to <strong>each side&apos;s traded amount</strong>: once on the buy and again on the sell. Example
          (delivery): a ₹10L position bought and sold trades ₹20L in total, so it costs ₹1,112.41 + ₹1,112.41 = ₹2,224.81,
          which is 0.11124% of the ₹20L traded but {pct(COST_PER_SIDE.delivery * 2)} of the ₹10L position. In a backtest:
          cost = turnover × rate.
        </p>
        <CodeRow code={costsSnippet} none="No imports needed." />
      </>
    ),
  },
  {
    title: "Walk-forward splits",
    text: "Train/test folds on calendar months, split by date, with a gap in trading days between train and test.",
    body: (
      <>
        <p className={t.text}>
          Set <code>gap</code> to how many trading days ahead your label looks. <code>describe(df)</code> shows each
          fold&apos;s dates and row counts.
        </p>
        <CodeRow code={walkForwardSnippet()} imports={walkForwardImportsSnippet()} />
      </>
    ),
  },
];

// Snippets and reference that apply to every experiment. One open at a time.
export function ToolsPage() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <PageHeader title="Tools" sub="Snippets and reference that apply to every experiment." />
      <Panel title="Tools" icon flush>
        <div className={t.list}>
          {TOOLS.map((tool, i) => {
            const isOpen = open === i;
            return (
              <section key={tool.title} className={t.item} data-open={isOpen}>
                <button type="button" className={t.head} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                  <span className={t.num}>{i + 1}</span>
                  <span className={t.headText}>
                    <strong className={t.title}>{tool.title}</strong>
                    <span className={t.desc}>{tool.text}</span>
                  </span>
                  <span className={t.chev} aria-hidden="true">
                    ›
                  </span>
                </button>
                {isOpen && <div className={t.body}>{tool.body}</div>}
              </section>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
