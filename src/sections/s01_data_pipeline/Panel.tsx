"use client";

import { useState } from "react";
import { formatCount, formatDate, formatValue } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, CodeBlock, Dialog, Panel, StatTiles, TwoColumn, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, latestComplete } from "@/data/queries";
import { datalakeSnippet, saveTableSnippet } from "@/features/snippets/snippets";
import { DatasetList } from "@/features/versions/DatasetList";
import { SaveDialog } from "@/features/versions/SaveDialog";
import { VersionDrawer } from "@/features/versions/VersionDrawer";

const FOLDER = "01_data_pipeline";

// The two notebook steps that make a snapshot: read from the datalake, then save it here.
function PullSteps({ experiment }: { experiment: string }) {
  return (
    <div className={p.stack}>
      <p className={p.muted}>1. Read from trl_datalake in your notebook.</p>
      <CodeBlock code={datalakeSnippet()} />
      <p className={p.muted}>2. Save it as this experiment&apos;s snapshot. Every later section reads this frozen copy.</p>
      <CodeBlock code={saveTableSnippet(experiment, FOLDER, "snapshot")} />
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
                  <PullSteps experiment={experiment} />
                </Panel>
              </div>
            )}
            <Panel title="Datasets" icon flush actions={<Button onClick={() => setSaving(true)}>Save a new dataset</Button>}>
              <DatasetList experiment={experiment} section={FOLDER} emptyText="Nothing saved yet. Run the two snippets above in your notebook to save the first snapshot." />
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
        <PullSteps experiment={experiment} />
      </Dialog>
      <SaveDialog open={saving} onClose={() => setSaving(false)} experiment={experiment} section={FOLDER} />
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
