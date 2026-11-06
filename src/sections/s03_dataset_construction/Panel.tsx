"use client";

import { useState } from "react";
import { formatValue, refLabel } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, Panel, StatTiles, Tabs, TwoColumn, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, latestComplete } from "@/data/queries";
import { DatasetList } from "@/features/versions/DatasetList";
import { SaveDialog } from "@/features/versions/SaveDialog";
import { VersionDrawer } from "@/features/versions/VersionDrawer";

const FOLDER = "03_dataset_construction";
const isFeature = (n: string) => n.startsWith("features_");
const isLabel = (n: string) => n.startsWith("labels");
type Tab = "features" | "labels" | "other";

export function DatasetConstructionPanel({ experiment }: SectionPanelProps) {
  const { datasets } = useLedger();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("features");

  const here = datasetsFor(datasets, experiment, FOLDER);
  const features = here.filter((d) => isFeature(d.name));
  const labelsDs = here.find((d) => isLabel(d.name));
  const labels = labelsDs && latestComplete(labelsDs);
  const others = here.filter((d) => !isFeature(d.name) && !isLabel(d.name));
  const snapshotInput = [...features, ...(labelsDs ? [labelsDs] : [])]
    .map((d) => latestComplete(d)?.inputs.find((i) => i.dataset === "snapshot"))
    .find(Boolean);

  const stats: [Stat, Stat?][] = [
    [
      { label: "Feature groups", value: features.length },
      { label: "Feature versions", value: features.reduce((n, d) => n + d.versions.length, 0) },
    ],
    [
      { label: "Label type", value: labels ? formatValue(labels.settings.label_type) : "Not set", tone: labels ? undefined : "warn" },
      { label: "Label horizon", value: labels?.settings.horizon_days ? `${formatValue(labels.settings.horizon_days)} days` : "Not set" },
    ],
    [
      { label: "Latest labels", value: labels ? `v${labels.ref.version}` : "–" },
      { label: "Built from", value: snapshotInput ? refLabel(snapshotInput, experiment) : "–" },
    ],
  ];

  const tabs: { id: Tab; label: string }[] = [
    { id: "features", label: `Features (${features.length})` },
    { id: "labels", label: `Labels (${labelsDs ? 1 : 0})` },
    ...(others.length ? [{ id: "other" as Tab, label: `Other (${others.length})` }] : []),
  ];

  return (
    <>
      <TwoColumn
        main={
          <Panel
            flush
            title={<Tabs tabs={tabs} active={tab} onChange={setTab} label="Dataset groups" />}
            actions={
              <Button variant="primary" onClick={() => setSaving(true)}>
                Save a new dataset
              </Button>
            }
          >
            {tab === "features" && (
              <DatasetList experiment={experiment} section={FOLDER} filter={isFeature} emptyText="Save one table per feature group, for example features_momentum." />
            )}
            {tab === "labels" && (
              <DatasetList
                experiment={experiment}
                section={FOLDER}
                filter={isLabel}
                emptyText="Save labels as their own dataset, for example labels, with the 12-day horizon in its settings."
              />
            )}
            {tab === "other" && (
              <DatasetList experiment={experiment} section={FOLDER} filter={(n) => !isFeature(n) && !isLabel(n)} emptyText="" />
            )}
          </Panel>
        }
        aside={
          <>
            <StatTiles rows={stats} />
            <Panel title="Rules for this section" icon>
              <ul className={p.rules}>
                <li>Features use only data up to each date.</li>
                <li>Plain formulas and same-date ranks belong here.</li>
                <li>Anything fitted on data, like scaling or GARCH, is fitted inside each training window in Model Development, or it leaks the future.</li>
                <li>Labels record their type, horizon and each row&apos;s end date.</li>
              </ul>
            </Panel>
          </>
        }
      />

      <SaveDialog open={saving} onClose={() => setSaving(false)} experiment={experiment} section={FOLDER} />
      <VersionDrawer experiment={experiment} section={FOLDER} />
    </>
  );
}
