"use client";

import { formatDate } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Panel, StatTiles, type Stat } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { CodeSteps, type CodeStep } from "@/features/files/CodeSteps";
import { formatBytes, useSectionFiles } from "@/features/files/files";
import { SavedFiles } from "@/features/files/SavedFiles";
import a from "@/features/files/steps.module.css";
import { pushFileImportsSnippet, pushFileSnippet, retrieveFileImportsSnippet, retrieveFileSnippet } from "@/features/snippets/snippets";

const FOLDER = "03_dataset_construction";

function steps(experiment: string): CodeStep[] {
  return [
    {
      title: "Retrieve from Data Pipeline",
      text: "Loads a file saved in this experiment's Data Pipeline (for example the daily OHLCV) into a DataFrame, to build from.",
      code: retrieveFileSnippet(experiment, "01_data_pipeline", "Nifty_Midcap150_OHLCV_daily.parquet"),
      imports: retrieveFileImportsSnippet(),
    },
    {
      title: "Push your data to S3",
      text: "Saves a DataFrame into this experiment's Dataset Construction folder under the name you give it. The same name again saves a new numbered copy (_v2, _v3, …).",
      code: pushFileSnippet(experiment, FOLDER, "dev_dataset.parquet"),
      imports: pushFileImportsSnippet(),
    },
    {
      title: "Retrieve it",
      text: "Loads a file you pushed here back into a DataFrame, in any notebook. Loads the newest copy unless you name a version.",
      code: retrieveFileSnippet(experiment, FOLDER, "dev_dataset.parquet"),
      imports: retrieveFileImportsSnippet(),
    },
  ];
}

// Development data, features and labels: built in the notebook from the Data Pipeline files and saved here.
export function DatasetConstructionPanel({ experiment }: SectionPanelProps) {
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
  ];

  return (
    <>
      <div style={{ marginBottom: 20, minWidth: 0 }}>
        <SavedFiles experiment={experiment} section={FOLDER} files={files} loading={loading} error={error} onRefresh={() => void refresh()} />
      </div>
      <div className={a.tiles}>
        <StatTiles rows={stats} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <Panel title="Notebook steps" icon flush>
          <CodeSteps steps={steps(experiment)} />
        </Panel>
      </div>
      <Panel title="Rules for this section" icon>
        <ul className={p.rules}>
          <li>Build only from the development data (up to the holdout start); the holdout stays untouched.</li>
          <li>Features use only data up to each date.</li>
          <li>Plain formulas and same-date ranks belong here.</li>
          <li>Anything fitted on data, like scaling or GARCH, is fitted inside each training window, or it leaks the future.</li>
          <li>Labels record their type, horizon and each row&apos;s end date.</li>
        </ul>
      </Panel>
    </>
  );
}
