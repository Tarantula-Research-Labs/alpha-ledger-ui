"use client";

import { useState } from "react";
import { formatDate, refLabel } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, CodeBlock } from "@/core/ui";
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

  return (
    <>
      <div className={p.toolbar}>
        <p className={p.toolbarText}>
          {latest?.reusedFrom ? (
            <>
              Using snapshot v{latest.ref.version}, <strong>reused from {refLabel(latest.reusedFrom)}</strong> in{" "}
              {latest.reusedFrom.experiment}. Identical data, nothing re-fetched.
            </>
          ) : latest ? (
            <>
              Using snapshot v{latest.ref.version}, <strong>a fresh pull from trl_datalake</strong> saved on {formatDate(latest.createdAt)}.
            </>
          ) : (
            <>No snapshot yet. Choose where this experiment&apos;s data comes from.</>
          )}
        </p>
        <div className={p.actions}>
          <Button variant={latest ? "default" : "primary"} onClick={() => setChoosing(true)}>
            Choose data source
          </Button>
          <Button onClick={() => setSaving(true)}>Save a new dataset</Button>
        </div>
      </div>

      <DatasetList
        experiment={experiment}
        section={FOLDER}
        emptyText="Reuse a snapshot from a past experiment, or pull fresh data from trl_datalake and save it here."
      />

      <details className={p.details}>
        <summary>Connect to trl_datalake</summary>
        <p className={p.detailsText}>
          For a fresh pull: run this in your notebook to read from the datalake, then save the result with the snapshot save snippet.
        </p>
        <CodeBlock code={datalakeSnippet()} />
      </details>

      <SourceChoice open={choosing} onClose={() => setChoosing(false)} experiment={experiment} />
      <SaveDialog open={saving} onClose={() => setSaving(false)} experiment={experiment} section={FOLDER} />
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
