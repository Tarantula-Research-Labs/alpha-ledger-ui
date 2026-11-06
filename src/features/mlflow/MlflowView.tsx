"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DEFAULT_LABEL_HORIZON_DAYS } from "@/core/config";
import { formatDate, formatDateTime, versionHref } from "@/core/format";
import { BarChart, Button, CardRow, EmptyState, Panel, StatTiles, Tabs, TwoColumn, identClass, type Stat } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { findDataset, findVersion } from "@/data/queries";
import { Lineage } from "@/features/lineage/Lineage";
import { VersionFacts } from "@/features/versions/VersionDetails";
import { PushDialog } from "./PushDialog";
import m from "./mlflow.module.css";

const METRIC_NAMES: Record<string, string> = { rank_ic: "Rank IC", icir: "ICIR", sharpe: "Sharpe", ic: "IC" };
const metricName = (k: string) => METRIC_NAMES[k] ?? k;
const fmt = (k: string, n: number) => n.toFixed(k === "sharpe" ? 2 : 3);

type Tab = "performance" | "runs" | "pushes";

// MLflow pushes for one section (Baseline Research or Model Development).
// Each push is one version holding mlflow.db + artifacts; the runs come from that copy.
export function MlflowView({ experiment, section, finalModel }: { experiment: string; section: string; finalModel: boolean }) {
  const { datasets } = useLedger();
  const params = useSearchParams();
  const [pushing, setPushing] = useState(false);
  const [tab, setTab] = useState<Tab>("performance");
  const [metric, setMetric] = useState<string | null>(null);

  const pushes = findDataset(datasets, experiment, section, "mlflow")?.versions ?? [];
  const asked = Number(params.get("v"));
  const selected = pushes.find((p) => p.ref.version === asked) ?? pushes.at(-1);

  const pushButton = (
    <Button variant="primary" onClick={() => setPushing(true)}>
      Push snippet
    </Button>
  );
  const dialog = <PushDialog open={pushing} onClose={() => setPushing(false)} experiment={experiment} section={section} finalModel={finalModel} />;

  if (!selected) {
    return (
      <Panel title="MLflow results" icon actions={pushButton}>
        <EmptyState title="No MLflow results pushed yet.">
          <p>
            Run this stage locally with MLflow. When it&apos;s done, push mlflow.db and the artifacts folder together. Each push
            becomes a version, and its runs, metrics and charts show up here.
          </p>
        </EmptyState>
        {dialog}
      </Panel>
    );
  }

  const push = selected.mlflow;
  const runs = push?.runs ?? [];
  const metricKeys = Array.from(new Set(runs.flatMap((r) => Object.keys(r.metrics))));
  const activeMetric = metric && metricKeys.includes(metric) ? metric : metricKeys.includes("sharpe") ? "sharpe" : metricKeys[0];
  const best = Object.fromEntries(metricKeys.map((k) => [k, Math.max(...runs.map((r) => r.metrics[k] ?? -Infinity))]));
  const finalRun = runs.find((r) => r.id === push?.finalRunId);

  // Safeguard: the walk-forward gap must cover the label horizon, or test data leaks into training.
  const labelInput = selected.inputs.find((i) => i.dataset.startsWith("labels"));
  const horizon = Number((labelInput && findVersion(datasets, labelInput)?.settings.horizon_days) ?? DEFAULT_LABEL_HORIZON_DAYS);
  const gapTooShort = push?.split ? push.split.gapDays < horizon : false;

  const bestSharpe = best.sharpe !== undefined && Number.isFinite(best.sharpe) ? best.sharpe : undefined;
  const stats: [Stat, Stat?][] = [
    [
      { label: "Push", value: `v${selected.ref.version} of ${pushes.length}` },
      { label: "Saved", value: formatDateTime(selected.createdAt) },
    ],
    [
      { label: "Runs", value: runs.length },
      { label: "Best Sharpe", value: bestSharpe !== undefined ? bestSharpe.toFixed(2) : "–", tone: bestSharpe !== undefined ? (bestSharpe >= 0 ? "up" : "down") : undefined },
    ],
    [
      { label: "Train window", value: push?.split ? `${push.split.trainDays} days` : "Not recorded" },
      { label: "Test window", value: push?.split ? `${push.split.testDays} days` : "Not recorded" },
    ],
    [
      { label: "Train/test gap", value: push?.split ? `${push.split.gapDays} days` : "Not recorded", tone: gapTooShort ? "down" : push?.split ? "up" : undefined },
      { label: "Label horizon", value: `${horizon} days` },
    ],
  ];
  if (finalModel) {
    stats.push([
      { label: "Final model", value: finalRun ? <span className={identClass}>{finalRun.name}</span> : "Not chosen", tone: finalRun ? undefined : "warn" },
      { label: "Optuna trials", value: push?.optunaTrials ?? "Not recorded", tone: push?.optunaTrials ? undefined : "warn" },
    ]);
  }
  stats.push([
    { label: "Code version", value: <span className={identClass}>{selected.codeVersion ?? "not recorded"}</span> },
    { label: "Built from", value: `${selected.inputs.length} inputs` },
  ]);

  return (
    <>
      <TwoColumn
        main={
          <Panel
            flush
            title={
              <Tabs
                tabs={[
                  { id: "performance", label: "Performance" },
                  { id: "runs", label: "Runs" },
                  { id: "pushes", label: "Pushes" },
                ]}
                active={tab}
                onChange={setTab}
                label="MLflow views"
              />
            }
            actions={pushButton}
          >
            {tab === "performance" && (
              <div className={m.perf}>
                <div className={m.perfHead}>
                  <div>
                    <p className={m.perfTitle}>
                      {metricName(activeMetric)} by run, push v{selected.ref.version}
                    </p>
                    <p className={m.perfSub}>
                      {finalModel && finalRun ? "The final model is the brighter bar." : "The best run is the brighter bar."}
                    </p>
                  </div>
                  <div className={m.metricPick} role="radiogroup" aria-label="Metric">
                    {metricKeys.map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={k === activeMetric} className={m.metricBtn} onClick={() => setMetric(k)}>
                        {metricName(k)}
                      </button>
                    ))}
                  </div>
                </div>
                <BarChart
                  label={`${metricName(activeMetric)} for each run in push v${selected.ref.version}`}
                  data={runs
                    .filter((r) => r.metrics[activeMetric] !== undefined)
                    .map((r) => ({
                      label: r.name,
                      value: r.metrics[activeMetric],
                      highlight: finalModel && finalRun ? r.id === finalRun.id : r.metrics[activeMetric] === best[activeMetric],
                    }))}
                  format={(n) => fmt(activeMetric, n)}
                />
                {gapTooShort && (
                  <p className={m.warn}>
                    The gap between train and test is {push?.split?.gapDays} days, but labels look {horizon} days ahead. Test data
                    leaks into training until the gap is at least {horizon} days.
                  </p>
                )}
              </div>
            )}

            {tab === "runs" && (
              <div className={m.tableWrap}>
                <table className={m.table}>
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Model</th>
                      <th scope="col">Parameters</th>
                      {metricKeys.map((k) => (
                        <th key={k} scope="col" className={m.num}>
                          {metricName(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => {
                      const isFinal = finalModel && push?.finalRunId === r.id;
                      return (
                        <tr key={r.id} className={isFinal ? m.final : undefined}>
                          <td>
                            <span className={`${m.runName} ${identClass}`}>{r.name}</span>
                            {isFinal && <span className={m.finalTag}>Final model</span>}
                            <span className={`${m.runId} ${identClass}`}>{r.id}</span>
                          </td>
                          <td>{r.model}</td>
                          <td className={`${m.params} ${identClass}`}>
                            {Object.entries(r.params)
                              .map(([k, v]) => `${k}=${v}`)
                              .join("  ")}
                          </td>
                          {metricKeys.map((k) => (
                            <td key={k} className={`${m.num} ${r.metrics[k] === best[k] ? m.best : ""}`}>
                              {r.metrics[k] !== undefined ? fmt(k, r.metrics[k]) : "–"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className={m.legend}>The best value in each metric column is green.</p>
              </div>
            )}

            {tab === "pushes" && (
              <div className={m.tableWrap}>
                <table className={m.table}>
                  <thead>
                    <tr>
                      <th scope="col">Push</th>
                      <th scope="col">Saved</th>
                      <th scope="col" className={m.num}>
                        Runs
                      </th>
                      <th scope="col">Code version</th>
                      <th scope="col">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...pushes].reverse().map((p) => (
                      <tr key={p.ref.version} className={p.ref.version === selected.ref.version ? m.final : undefined}>
                        <td>
                          <Link href={versionHref(p.ref)} scroll={false} className={m.pushLink} aria-current={p.ref.version === selected.ref.version ? "true" : undefined}>
                            v{p.ref.version}
                          </Link>
                        </td>
                        <td>{formatDate(p.createdAt)}</td>
                        <td className={m.num}>{p.mlflow?.runs.length ?? 0}</td>
                        <td className={identClass}>{p.codeVersion ?? "–"}</td>
                        <td className={m.params}>{p.notes ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        }
        aside={<StatTiles rows={stats} />}
      />

      <CardRow>
        <Panel title="Lineage" icon>
          <Lineage of={selected.ref} />
        </Panel>
        <Panel title={`Push v${selected.ref.version} details`} icon>
          <VersionFacts version={selected} />
        </Panel>
      </CardRow>
      {dialog}
    </>
  );
}
