"use client";

import Link from "next/link";
import { formatDate, formatValue, folderLabel, versionHref } from "@/core/format";
import type { SectionMeta } from "@/core/sections";
import { CardRow, PageHeader, Panel, StatTiles, StatusMark, TwoColumn, VersionTicks, identClass, type Stat } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { allVersions, datasetsFor, findDataset, lastSaved, latestComplete } from "@/data/queries";
import x from "./experiments.module.css";

// One experiment at a glance: the pipeline on the left, key facts on the right, recent saves below.
export function ExperimentOverview({ experiment, sections }: { experiment: string; sections: SectionMeta[] }) {
  const { experiments, datasets } = useLedger();
  const exp = experiments.find((e) => e.name === experiment);
  if (!exp) return null;

  const versions = allVersions(datasets, experiment);
  const failed = versions.filter((v) => v.status === "failed").length;
  const last = lastSaved(datasets, experiment);

  const snapshotDs = findDataset(datasets, experiment, "01_data_pipeline", "snapshot");
  const snapshot = snapshotDs && latestComplete(snapshotDs);
  const labelsDs = findDataset(datasets, experiment, "03_dataset_construction", "labels");
  const labels = labelsDs && latestComplete(labelsDs);
  const modelDs = findDataset(datasets, experiment, "06_model_development", "mlflow");
  const model = modelDs && latestComplete(modelDs);
  const finalRun = model?.mlflow?.runs.find((r) => r.id === model.mlflow?.finalRunId);
  const split = model?.mlflow?.split ?? (() => {
    const b = findDataset(datasets, experiment, "05_baseline_research", "mlflow");
    return b && latestComplete(b)?.mlflow?.split;
  })();

  const stats: [Stat, Stat?][] = [
    [
      { label: "Versions saved", value: versions.length },
      { label: "Last save", value: last ? formatDate(last) : "Nothing yet" },
    ],
    [
      { label: "Datasets", value: datasetsFor(datasets, experiment).length },
      { label: "Failed saves", value: failed, tone: failed ? "down" : undefined },
    ],
    [
      { label: "Snapshot", value: snapshot ? `v${snapshot.ref.version}` : "None yet" },
      { label: "Source", value: snapshot ? (snapshot.reusedFrom ? `Reused from ${snapshot.reusedFrom.experiment}` : "Fresh pull") : "Not chosen" },
    ],
    [
      { label: "Label type", value: labels ? formatValue(labels.settings.label_type) : "Not set" },
      { label: "Label horizon", value: labels?.settings.horizon_days ? `${formatValue(labels.settings.horizon_days)} days` : "Not set" },
    ],
    [
      { label: "Final model", value: finalRun ? <span className={identClass}>{finalRun.name}</span> : "Not chosen" },
      {
        label: "Final Sharpe",
        value: finalRun?.metrics.sharpe !== undefined ? finalRun.metrics.sharpe.toFixed(2) : "–",
        tone: finalRun?.metrics.sharpe !== undefined ? (finalRun.metrics.sharpe >= 0 ? "up" : "down") : undefined,
      },
    ],
    [
      { label: "Walk-forward", value: split ? `Train ${split.trainDays}, test ${split.testDays}` : "Not recorded" },
      { label: "Gap", value: split ? `${split.gapDays} days` : "–" },
    ],
  ];

  const recent = [...versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <>
      <PageHeader
        back={{ href: "/experiments", label: "Back to experiments" }}
        title={exp.name}
        ident
        sub={exp.description}
        links={[{ href: `/experiments/${experiment}/01_data_pipeline`, label: "Open Data Pipeline" }]}
      />

      <TwoColumn
        main={
          <Panel title="Pipeline" icon flush actions={<span className={x.headNote}>Created {formatDate(exp.createdAt)}</span>}>
            <ol className={x.pipeline}>
              {sections.map((sec) => {
                const ds = datasetsFor(datasets, experiment, sec.folder);
                return (
                  <li key={sec.folder}>
                    <Link href={`/experiments/${experiment}/${sec.folder}`} className={x.stage} data-active={sec.active}>
                      <span className={x.stageNum} aria-hidden="true">
                        {sec.number}
                      </span>
                      <span className={x.stageBody}>
                        <span className={x.stageTitle}>
                          <span className="sr-only">{sec.number} </span>
                          {sec.title}
                        </span>
                        {!sec.active ? (
                          <span className={x.stageNote}>Skipped for now</span>
                        ) : ds.length === 0 ? (
                          <span className={x.stageNote}>Nothing saved yet</span>
                        ) : (
                          <span className={x.entries}>
                            {ds.map((d) => {
                              const latest = latestComplete(d);
                              const lastV = d.versions.at(-1);
                              return (
                                <span key={d.name} className={x.entry}>
                                  <span className={`${x.entryName} ${identClass}`}>{d.name}</span>
                                  <VersionTicks versions={d.versions.map((v) => ({ version: v.ref.version, status: v.status }))} />
                                  <span className={x.entryMeta}>
                                    {latest ? `v${latest.ref.version}, ${formatDate(latest.createdAt)}` : "No complete version"}
                                    {lastV?.status === "failed" && <span className={x.failedNote}> v{lastV.ref.version} failed</span>}
                                  </span>
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </span>
                      <span className={x.chev} aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Panel>
        }
        aside={<StatTiles rows={stats} />}
      />

      <CardRow>
        <Panel title="Recent saves" icon flush>
          {recent.length === 0 ? (
            <p className={x.cardEmpty}>Nothing saved yet. Start with the Data Pipeline.</p>
          ) : (
            <ul className={x.activity}>
              {recent.map((v) => (
                <li key={`${v.ref.section}/${v.ref.dataset}/${v.ref.version}`}>
                  <Link href={versionHref(v.ref)} className={`${x.activityName} ${identClass}`}>
                    {v.ref.dataset} v{v.ref.version}
                  </Link>
                  <span className={x.activitySection}>{folderLabel(v.ref.section)}</span>
                  <StatusMark status={v.status} />
                  <span className={x.activityDate}>{formatDate(v.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </CardRow>
    </>
  );
}
