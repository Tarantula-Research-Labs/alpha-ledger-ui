"use client";

import { useState } from "react";
import type { SectionPanelProps } from "@/core/sections";
import { Button } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { DatasetList } from "@/features/versions/DatasetList";
import { SaveDialog } from "@/features/versions/SaveDialog";
import { VersionDrawer } from "@/features/versions/VersionDrawer";

const FOLDER = "03_dataset_construction";
const isFeature = (n: string) => n.startsWith("features_");
const isLabel = (n: string) => n.startsWith("labels");

export function DatasetConstructionPanel({ experiment }: SectionPanelProps) {
  const [saving, setSaving] = useState(false);

  return (
    <>
      <p className={p.rule}>
        <strong>Features use only data up to each date.</strong> Plain formulas and same-date ranks belong here. Anything fitted on
        data, like scaling or GARCH, is fitted inside each training window in Model Development, or it leaks the future.
      </p>

      <div className={p.toolbar}>
        <p className={p.toolbarText}>Adding a feature group never touches the others. Labels record their type, horizon and each row&apos;s end date.</p>
        <Button variant="primary" onClick={() => setSaving(true)}>
          Save a new dataset
        </Button>
      </div>

      <DatasetList
        experiment={experiment}
        section={FOLDER}
        heading="Features"
        filter={isFeature}
        emptyText="Save one table per feature group, for example features_momentum."
      />
      <DatasetList
        experiment={experiment}
        section={FOLDER}
        heading="Labels"
        filter={isLabel}
        emptyText="Save labels as their own dataset, for example labels, with the 12-day horizon in its settings."
      />
      <DatasetList
        experiment={experiment}
        section={FOLDER}
        heading="Other"
        filter={(n) => !isFeature(n) && !isLabel(n)}
        emptyText=""
        hideWhenEmpty
      />

      <SaveDialog open={saving} onClose={() => setSaving(false)} experiment={experiment} section={FOLDER} />
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
