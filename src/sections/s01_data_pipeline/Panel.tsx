"use client";

import { useState } from "react";
import { formatCount, formatDate, formatValue, refLabel } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, CodeBlock, Dialog, Panel, StatTiles, TwoColumn, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, latestComplete } from "@/data/queries";
import { datalakeSnippet } from "@/features/snippets/snippets";
import { DatasetList } from "@/features/versions/DatasetList";
import { SaveDialog } from "@/features/versions/SaveDialog";
import { VersionDrawer } from "@/features/versions/VersionDrawer";
import { SourceChoice } from "./SourceChoice";

const FOLDER = "01_data_pipeline";

export function DataPipelinePanel({ experiment }: SectionPanelProps) {
  const { datasets } = useLedger();
  const here = datasetsFor(datasets, experiment, FOLDER);
  const snapshot = here.find((d) => d.name === "snapshot");
  const latest = snapshot ? latestComplete(snapshot) : undefined;

  // Opening an experiment with no snapshot asks straight away where its data comes from.
  const [choosing, setChoosing] = useState(here.length === 0);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const s = latest?.settings ?? {};
  const stats: [Stat, Stat?][] = [
    [
      { label: "Snapshot in use", value: latest ? `v${latest.ref.version}` : "None yet", tone: latest ? undefined : "warn" },
      { label: "Source", value: latest ? (latest.reusedFrom ? "Same as a past experiment" : "Fresh pull") : "Not chosen" },
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
            <Panel
              title="Datasets"
              icon
              flush
              actions={
                <>
                  <Button onClick={() => setSaving(true)}>Save a new dataset</Button>
                  <Button variant={latest ? "default" : "primary"} onClick={() => setChoosing(true)}>
                    Choose data source
                  </Button>
                </>
              }
            >
              <DatasetList
                experiment={experiment}
                section={FOLDER}
                emptyText="Reuse a snapshot from a past experiment, or pull fresh data from trl_datalake and save it here."
              />
            </Panel>
            {latest && (
              <p className={p.note}>
                {latest.reusedFrom ? (
                  <>
                    Snapshot v{latest.ref.version} is <strong>reused from {refLabel(latest.reusedFrom)}</strong> in {latest.reusedFrom.experiment}.
                    Identical data, nothing re-fetched.
                  </>
                ) : (
                  <>
                    Snapshot v{latest.ref.version} is <strong>a fresh pull from trl_datalake</strong>. Every later section reads this frozen copy.
                  </>
                )}
              </p>
            )}
          </>
        }
        aside={
          <>
            <StatTiles rows={stats} />
            <Panel title="trl_datalake" icon>
              <p className={p.text}>For a fresh pull, read from the datalake in your notebook, then save it with the snapshot save snippet.</p>
              <Button onClick={() => setConnecting(true)}>Connection snippet</Button>
            </Panel>
          </>
        }
      />

      <Dialog open={connecting} onClose={() => setConnecting(false)} title="Connect to trl_datalake" wide>
        <CodeBlock code={datalakeSnippet()} />
      </Dialog>
      <SourceChoice open={choosing} onClose={() => setChoosing(false)} experiment={experiment} />
      <SaveDialog open={saving} onClose={() => setSaving(false)} experiment={experiment} section={FOLDER} />
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
