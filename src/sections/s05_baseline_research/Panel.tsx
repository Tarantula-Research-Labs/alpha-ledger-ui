"use client";

import { useState } from "react";
import { formatDate } from "@/core/format";
import type { SectionPanelProps } from "@/core/sections";
import { Button, Panel, StatTiles, type Stat } from "@/core/ui";
import { SectionHeader } from "@/features/experiments/SectionHeader";
import { CodeSteps, type CodeStep } from "@/features/files/CodeSteps";
import { formatBytes, useSectionFiles } from "@/features/files/files";
import { SavedFiles } from "@/features/files/SavedFiles";
import a from "@/features/files/steps.module.css";
import { SectionMarks } from "@/features/marks/SectionMarks";
import { ResultsView } from "@/features/results/ResultsView";
import { mlflowZipImportsSnippet, pushMlflowZipSnippet, retrieveMlflowZipSnippet } from "@/features/snippets/snippets";
import { BASELINE_PATHS } from "./paths";

const FOLDER = "05_baseline_research";

function steps(experiment: string): CodeStep[] {
  return [
    {
      title: "Zip and push your MLflow results",
      text: "Zips mlflow.db and the mlruns folder into one file and pushes it here. Use one name per path; the same name again saves a new version (_v2, _v3, …).",
      code: pushMlflowZipSnippet(experiment, FOLDER, "mlflow_path_1.zip"),
      imports: mlflowZipImportsSnippet(),
    },
    {
      title: "Retrieve and open it",
      text: "Downloads a pushed zip and unzips it, so you can open the runs again with mlflow ui on any machine.",
      code: retrieveMlflowZipSnippet(experiment, FOLDER, "mlflow_path_1.zip"),
      imports: mlflowZipImportsSnippet(),
    },
  ];
}

type View = "dashboard" | "files";

// Baseline Research has two views, switched with one button:
//   Dashboard: the results read from the pushed MLflow zips, full width, nothing else on the page.
//   Files & code: the usual section page (title, drafts, saved files, notebook steps).
export function BaselineResearchPanel({ experiment, section, sections }: SectionPanelProps) {
  const { files, loading, error, refresh } = useSectionFiles(experiment, FOLDER);
  const [chosenView, setView] = useState<View | null>(null);

  const done = files.filter((f) => f.status === "complete");
  const hasResults = BASELINE_PATHS.some((p) => p.source && done.some((f) => f.file === p.source?.zip));
  // Open on the dashboard once a path's zip has been pushed, otherwise on Files & code.
  const view: View = chosenView ?? (hasResults ? "dashboard" : "files");

  if (view === "dashboard") {
    return (
      <div data-wide-page>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <Button onClick={() => setView("files")}>Files &amp; code ›</Button>
        </div>
        <ResultsView experiment={experiment} section={FOLDER} paths={BASELINE_PATHS} />
      </div>
    );
  }

  const newest = done[0];
  const stats: [Stat, Stat?][] = [
    [
      { label: "Files saved", value: done.length, tone: done.length ? undefined : "warn" },
      { label: "Total size", value: done.length ? formatBytes(done.reduce((n, f) => n + (f.sizeBytes ?? 0), 0)) : "–" },
    ],
    [
      { label: "Latest push", value: newest ? formatDate(newest.createdAt) : "–" },
      { label: "Latest version", value: newest ? `v${newest.version}` : "–" },
    ],
  ];

  return (
    <>
      {section && sections && (
        <SectionHeader
          experiment={experiment}
          section={section}
          sections={sections}
          actions={
            <Button variant="primary" onClick={() => setView("dashboard")}>
              Dashboard ›
            </Button>
          }
        />
      )}
      <SectionMarks experiment={experiment} section={FOLDER} />
      <div style={{ marginBottom: 20, minWidth: 0 }}>
        <SavedFiles experiment={experiment} section={FOLDER} files={files} loading={loading} error={error} onRefresh={() => void refresh()} />
      </div>
      <div className={a.tiles}>
        <StatTiles rows={stats} />
      </div>
      <Panel title="Notebook steps" icon flush>
        <CodeSteps steps={steps(experiment)} />
      </Panel>
    </>
  );
}
