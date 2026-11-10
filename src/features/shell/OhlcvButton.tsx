"use client";

import { useState } from "react";
import { CodeBlock, Dialog } from "@/core/ui";
import { SectionIcon } from "@/core/ui/icons";
import { dbConnectImportsSnippet, dbConnectSnippet, loadMarketDataSnippet } from "@/features/snippets/snippets";
import o from "./ohlcv.module.css";

// Top-bar button: the code to connect to the market database and load OHLCV, from any page of an experiment.
export function OhlcvButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={o.button} onClick={() => setOpen(true)} title="Code to connect to the database and load OHLCV">
        <SectionIcon name="database" />
        <span className={o.label}>OHLCV data</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Get OHLCV data" wide>
        <p className={o.text}>
          <strong>1. Connect to the database.</strong> Opens a connection to the market data in Postgres. Keep the database
          credentials in a .env file next to your notebook.
        </p>
        <div className={o.row}>
          <div className={o.main}>
            <CodeBlock code={dbConnectSnippet()} />
          </div>
          <div className={o.side}>
            <CodeBlock code={dbConnectImportsSnippet()} label="Imports" />
          </div>
        </div>
        <p className={o.text}>
          <strong>2. Load the data.</strong> Reads daily prices for the tickers you list into a DataFrame.
        </p>
        <div className={o.row}>
          <div className={o.main}>
            <CodeBlock code={loadMarketDataSnippet()} />
          </div>
          <div className={o.side}>
            <p className={o.none}>No imports needed: uses db from step 1.</p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
