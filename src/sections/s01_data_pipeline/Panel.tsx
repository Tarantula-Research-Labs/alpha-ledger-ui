"use client";

import { useState } from "react";
import { formatCount, formatDate, formatValue } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, CodeBlock, Dialog, Panel, StatTiles, TwoColumn, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, latestComplete } from "@/data/queries";
import { dbConnectSnippet, loadMarketDataSnippet, pushPipelineFileSnippet, retrievePipelineFileSnippet } from "@/features/snippets/snippets";
import { VersionDrawer } from "@/features/versions/VersionDrawer";

const FOLDER = "01_data_pipeline";

// The notebook steps: pull from Postgres, then push files to this experiment's folder in S3, and retrieve them.
function PullSteps({ experiment }: { experiment: string }) {
  return (
    <div className={p.stack}>
      <p className={p.muted}>
        <strong>1. Connect to the database.</strong> Opens a connection to the market data in Postgres. Keep the database
        credentials in a .env file next to your notebook.
      </p>
      <CodeBlock code={dbConnectSnippet()} />
      <p className={p.muted}>
        <strong>2. Load the data.</strong> Reads daily prices for the tickers you list into a DataFrame. Nothing is saved yet.
      </p>
      <CodeBlock code={loadMarketDataSnippet()} />
      <p className={p.muted}>
        <strong>3. Push your file to S3.</strong> Uploads your local parquet file (for example the point-in-time universe) into
        this experiment&apos;s Data Pipeline folder, under the same name. Pushing again keeps the old copy and saves a new
        numbered one (_v2, _v3, …). Needs <code>LEDGER_API_KEY=&lt;your key&gt;</code> in the same .env.
      </p>
      <CodeBlock code={pushPipelineFileSnippet(experiment)} />
      <p className={p.muted}>
        <strong>4. Retrieve it.</strong> Loads a file you pushed back into a DataFrame, in any notebook. Loads the newest copy
        unless you name a version.
      </p>
      <CodeBlock code={retrievePipelineFileSnippet(experiment)} />
    </div>
  );
}

// Every experiment pulls its own data fresh from trl_datalake.
// (Cloning an experiment with its data is planned for phase 2.)
export function DataPipelinePanel({ experiment }: SectionPanelProps) {
  const { datasets } = useLedger();
  const here = datasetsFor(datasets, experiment, FOLDER);
  const snapshot = here.find((d) => d.name === "snapshot");
  const latest = snapshot ? latestComplete(snapshot) : undefined;

  const [pulling, setPulling] = useState(false);

  const s = latest?.settings ?? {};
  const stats: [Stat, Stat?][] = [
    [
      { label: "Snapshot in use", value: latest ? `v${latest.ref.version}` : "None yet", tone: latest ? undefined : "warn" },
      { label: "Source", value: "trl_datalake" },
    ],
    [
      { label: "Rows", value: latest?.rows !== undefined ? formatCount(latest.rows) : "–" },
      { label: "Columns", value: latest?.columns?.length ?? "–" },
    ],
    [
      { label: "From", value: s.start ? formatValue(s.start) : "–" },
      { label: "To", value: s.end ? formatValue(s.end) : "–" },
    ],
    [
      { label: "Saved", value: latest ? formatDate(latest.createdAt) : "–" },
      { label: "Datasets", value: here.length },
    ],
  ];

  return (
    <>
      <TwoColumn
        main={
          <>
            {!latest && (
              <div style={{ marginBottom: 20 }}>
                <Panel title="Notebook steps" icon>
                  <PullSteps experiment={experiment} />
                </Panel>
              </div>
            )}
            {latest && (
              <p className={p.note}>
                Snapshot v{latest.ref.version} is <strong>a fresh pull from trl_datalake</strong>. Every later section reads this frozen copy.
              </p>
            )}
          </>
        }
        aside={
          <>
            <StatTiles rows={stats} />
            {latest && (
              <Panel title="trl_datalake" icon>
                <p className={p.text}>Need newer data? Pull again and save it as the next snapshot version. Earlier versions stay as they are.</p>
                <Button onClick={() => setPulling(true)}>Pull a new snapshot</Button>
              </Panel>
            )}
          </>
        }
      />

      <Dialog open={pulling} onClose={() => setPulling(false)} title="Pull a new snapshot" wide>
        <PullSteps experiment={experiment} />
      </Dialog>
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
