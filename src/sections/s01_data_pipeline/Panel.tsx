"use client";

import { useState } from "react";
import { formatDate } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, Dialog, Panel, StatTiles, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, latestComplete } from "@/data/queries";
import { VersionDrawer } from "@/features/versions/VersionDrawer";
import { formatBytes, useSectionFiles } from "@/features/files/files";
import { SavedFiles } from "@/features/files/SavedFiles";
import a from "@/features/files/steps.module.css";
import { NotebookSteps } from "./NotebookSteps";

const FOLDER = "01_data_pipeline";

// Every experiment pulls its own data fresh from trl_datalake.
// (Cloning an experiment with its data is planned for phase 2.)
export function DataPipelinePanel({ experiment }: SectionPanelProps) {
  const { datasets } = useLedger();
  const here = datasetsFor(datasets, experiment, FOLDER);
  const snapshot = here.find((d) => d.name === "snapshot");
  const latest = snapshot ? latestComplete(snapshot) : undefined;

  const [pulling, setPulling] = useState(false);
  const { files, loading, error, refresh } = useSectionFiles(experiment, FOLDER);

  // File stats: complete files only (files come newest first).
  const done = files.filter((f) => f.status === "complete");
  const newest = done[0];
  const totalBytes = done.reduce((n, f) => n + (f.sizeBytes ?? 0), 0);
  const stats: [Stat, Stat?][] = [
    [
      { label: "Files saved", value: done.length, tone: done.length ? undefined : "warn" },
      { label: "Total size", value: done.length ? formatBytes(totalBytes) : "–" },
    ],
    [
      { label: "Latest push", value: newest ? formatDate(newest.createdAt) : "–" },
      { label: "Latest version", value: newest ? `v${newest.version}` : "–" },
    ],
    [{ label: "Source", value: "trl_datalake" }],
  ];

  return (
    <>
      {/* Full width: the table has many columns. */}
      <div style={{ marginBottom: 20, minWidth: 0 }}>
        <SavedFiles experiment={experiment} section={FOLDER} files={files} loading={loading} error={error} onRefresh={() => void refresh()} />
      </div>
      <div className={a.tiles}>
        <StatTiles rows={stats} />
      </div>
      {latest && (
        <div style={{ marginBottom: 20 }}>
          <Panel title="trl_datalake" icon>
            <p className={p.text}>Need newer data? Pull again and save it as the next snapshot version. Earlier versions stay as they are.</p>
            <Button onClick={() => setPulling(true)}>Pull a new snapshot</Button>
          </Panel>
        </div>
      )}
      <Panel title="Notebook steps" icon flush>
        <NotebookSteps experiment={experiment} />
      </Panel>

      <Dialog open={pulling} onClose={() => setPulling(false)} title="Pull a new snapshot" wide>
        <NotebookSteps experiment={experiment} />
      </Dialog>
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
