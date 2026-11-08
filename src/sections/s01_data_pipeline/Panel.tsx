"use client";

import { useState } from "react";
import { formatCount, formatDate, formatValue } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, CodeBlock, Dialog, Panel, StatTiles, TwoColumn, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, latestComplete } from "@/data/queries";
import { dbConnectSnippet, loadMarketDataSnippet } from "@/features/snippets/snippets";
import { DatasetList } from "@/features/versions/DatasetList";
import { SaveDialog } from "@/features/versions/SaveDialog";
import { VersionDrawer } from "@/features/versions/VersionDrawer";

const FOLDER = "01_data_pipeline";

// The notebook steps that get the data: connect to the database, then load it.
// (How the data is saved is decided later, during research.)
function PullSteps() {
  return (
    <div className={p.stack}>
      <p className={p.muted}>1. Connect to the database. Keep the credentials in a .env file next to your notebook.</p>
      <CodeBlock code={dbConnectSnippet()} />
      <p className={p.muted}>2. Load the data for this experiment.</p>
      <CodeBlock code={loadMarketDataSnippet()} />
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

  const [saving, setSaving] = useState(false);
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
                <Panel title="Pull this experiment's data" icon>
                  <PullSteps />
                </Panel>
              </div>
            )}
            <Panel title="Datasets" icon flush actions={<Button onClick={() => setSaving(true)}>Save a new dataset</Button>}>
              <DatasetList experiment={experiment} section={FOLDER} emptyText="Nothing saved yet. Run the snippets above in your notebook to save the first snapshot." />
            </Panel>
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
        <PullSteps />
      </Dialog>
      <SaveDialog open={saving} onClose={() => setSaving(false)} experiment={experiment} section={FOLDER} />
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
