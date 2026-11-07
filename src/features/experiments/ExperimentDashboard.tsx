"use client";

import Link from "next/link";
import { formatDate, formatValue, folderLabel, versionHref } from "@/core/format";
import type { SectionMeta } from "@/core/sections";
import { ButtonLink, KpiCard, KpiRow, PageHeader, Panel, StatTiles, StatusMark, TwoColumn, VersionTicks, identClass, type Stat } from "@/core/ui";
import { ClockIcon, SectionIcon, TrendIcon, VersionsIcon } from "@/core/ui/icons";
import { useLedger } from "@/data/LedgerProvider";
import { allVersions, datasetsFor, findDataset, lastSaved, latestComplete } from "@/data/queries";
import x from "./experiments.module.css";

// The dashboard of one experiment: headline numbers, how far each section has got, key facts and recent saves.
// Research charts and reports will be added here once the first baseline is stored.
export function ExperimentDashboard({ experiment, sections }: { experiment: string; sections: SectionMeta[] }) {
  const { experiments, datasets } = useLedger();
  const exp = experiments.find((e) => e.name === experiment);
  if (!exp) return null;

  const versions = allVersions(datasets, experiment);
  const failed = versions.filter((v) => v.status === "failed").length;
  const last = lastSaved(datasets, experiment);
  const lastVersion = [...versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const snapshotDs = findDataset(datasets, experiment, "01_data_pipeline", "snapshot");
  const snapshot = snapshotDs && latestComplete(snapshotDs);
  const labelsDs = findDataset(datasets, experiment, "03_dataset_construction", "labels");
  const labels = labelsDs && latestComplete(labelsDs);
  const modelDs = findDataset(datasets, experiment, "06_model_development", "mlflow");
  const model = modelDs && latestComplete(modelDs);
  const finalRun = model?.mlflow?.runs.find((r) => r.id === model.mlflow?.finalRunId);
  const baselineDs = findDataset(datasets, experiment, "05_baseline_research", "mlflow");
  const baseline = baselineDs && latestComplete(baselineDs);
  const split = model?.mlflow?.split ?? baseline?.mlflow?.split;
  const sharpe = finalRun?.metrics.sharpe;

  const facts: [Stat, Stat?][] = [
    [
      { label: "Label type", value: labels ? formatValue(labels.settings.label_type) : "Not set" },
      { label: "Label horizon", value: labels?.settings.horizon_days ? `${formatValue(labels.settings.horizon_days)} days` : "Not set" },
    ],
    [
      { label: "Walk-forward", value: split ? `Train ${split.trainDays}, test ${split.testDays}` : "Not recorded" },
      { label: "Train/test gap", value: split ? `${split.gapDays} days` : "–" },
    ],
    [
      { label: "Final model", value: finalRun ? <span className={identClass}>{finalRun.name}</span> : "Not chosen" },
      { label: "Optuna trials", value: model?.mlflow?.optunaTrials ?? "–" },
    ],
    [
      { label: "Datasets", value: datasetsFor(datasets, experiment).length },
      { label: "Failed saves", value: failed, tone: failed ? "down" : undefined },
    ],
  ];

  const busiest = Math.max(1, ...datasetsFor(datasets, experiment).map((d) => d.versions.length));
  const recent = [...versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub={exp.description || undefined}
        actions={
          <>
            <span className={x.headNote}>Created {formatDate(exp.createdAt)}</span>
            <ButtonLink href={`/experiments/${experiment}/01_data_pipeline`} variant="primary">
              Open Data Pipeline
            </ButtonLink>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Versions saved" icon={<VersionsIcon />} value={versions.length} note={`Across ${datasetsFor(datasets, experiment).length} datasets`} />
        <KpiCard
          label="Last save"
          icon={<ClockIcon />}
          value={last ? formatDate(last) : "Nothing yet"}
          note={lastVersion ? `${lastVersion.ref.dataset} v${lastVersion.ref.version}` : "Start with the Data Pipeline"}
        />
        <KpiCard
          label="Snapshot in use"
          icon={<SectionIcon name="database" />}
          value={snapshot ? `v${snapshot.ref.version}` : "None yet"}
          note={snapshot ? "Fresh pull from trl_datalake" : "Pull it in the Data Pipeline"}
          tone={snapshot ? undefined : "warn"}
        />
        <KpiCard
          label="Final model Sharpe"
          icon={<TrendIcon />}
          emphasis
          value={sharpe !== undefined ? sharpe.toFixed(2) : "–"}
          note={finalRun ? finalRun.name : "No final model yet"}
          tone={sharpe !== undefined ? (sharpe >= 0 ? "up" : "down") : undefined}
        />
      </KpiRow>

      <TwoColumn
        main={
          <Panel title="Pipeline progress" icon flush>
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
                                  <VersionTicks versions={d.versions.map((v) => ({ version: v.ref.version, status: v.status }))} max={busiest} />
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
        aside={
          <>
            <StatTiles rows={facts} />
          </>
        }
      />

      <div style={{ marginTop: 20 }}>
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
      </div>
    </>
  );
}
