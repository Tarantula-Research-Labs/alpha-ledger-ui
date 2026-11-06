"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DEFAULT_LABEL_HORIZON_DAYS } from "@/core/config";
import { formatDate, versionHref } from "@/core/format";
import { Button, EmptyState, identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { findDataset, findVersion } from "@/data/queries";
import { VersionDetails } from "@/features/versions/VersionDetails";
import { PushDialog } from "./PushDialog";
import m from "./mlflow.module.css";

const METRIC_NAMES: Record<string, string> = { rank_ic: "Rank IC", icir: "ICIR", sharpe: "Sharpe", ic: "IC" };
const metricName = (k: string) => METRIC_NAMES[k] ?? k;

// MLflow pushes for one section (Baseline Research or Model Development).
// Each push is one version holding mlflow.db + artifacts; the runs come from that copy.
export function MlflowView({ experiment, section, finalModel }: { experiment: string; section: string; finalModel: boolean }) {
  const { datasets } = useLedger();
  const params = useSearchParams();
  const [pushing, setPushing] = useState(false);

  const pushes = findDataset(datasets, experiment, section, "mlflow")?.versions ?? [];
  const asked = Number(params.get("v"));
  const selected = pushes.find((p) => p.ref.version === asked) ?? pushes.at(-1);

  const pushButton = (
    <Button variant="primary" onClick={() => setPushing(true)}>
      Push snippet
    </Button>
  );

  if (!selected) {
    return (
      <>
        <EmptyState title="No MLflow results pushed yet." action={pushButton}>
          <p>
            Run this stage locally with MLflow. When it&apos;s done, push mlflow.db and the artifacts folder together. Each push
            becomes a version, and the runs show up here.
          </p>
        </EmptyState>
        <PushDialog open={pushing} onClose={() => setPushing(false)} experiment={experiment} section={section} finalModel={finalModel} />
      </>
    );
  }

  const push = selected.mlflow;
  const runs = push?.runs ?? [];
  const metricKeys = Array.from(new Set(runs.flatMap((r) => Object.keys(r.metrics))));
  const best = Object.fromEntries(metricKeys.map((k) => [k, Math.max(...runs.map((r) => r.metrics[k] ?? -Infinity))]));

  // Safeguard: the walk-forward gap must cover the label horizon, or test data leaks into training.
  const labelInput = selected.inputs.find((i) => i.dataset.startsWith("labels"));
  const horizon = Number((labelInput && findVersion(datasets, labelInput)?.settings.horizon_days) ?? DEFAULT_LABEL_HORIZON_DAYS);
  const gapTooShort = push?.split && push.split.gapDays < horizon;

  return (
    <>
      <div className={m.toolbar}>
        <nav className={m.pushes} aria-label="Pushes">
          {[...pushes].reverse().map((p) => (
            <Link
              key={p.ref.version}
              href={versionHref(p.ref)}
              scroll={false}
              className={m.push}
              aria-current={p.ref.version === selected.ref.version ? "true" : undefined}
            >
              <span className={m.pushVersion}>v{p.ref.version}</span>
              <span className={m.pushMeta}>
                {formatDate(p.createdAt)}, {p.mlflow?.runs.length ?? 0} runs
              </span>
            </Link>
          ))}
        </nav>
        {pushButton}
      </div>

      <section className={m.runsSection}>
        <h2 className={m.heading}>Runs in v{selected.ref.version}</h2>
        <div className={m.tableWrap}>
          <table className={m.runs}>
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
                        {r.metrics[k] !== undefined ? r.metrics[k].toFixed(k === "sharpe" ? 2 : 3) : "–"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={m.legend}>The highest value in each metric column is in brass.</p>
      </section>

      <dl className={m.facts}>
        {push?.split && (
          <div>
            <dt>Walk-forward windows</dt>
            <dd>
              Train {push.split.trainDays} days, test {push.split.testDays}, gap {push.split.gapDays}
            </dd>
          </div>
        )}
        {finalModel && (
          <div>
            <dt>Optuna trials</dt>
            <dd>{push?.optunaTrials ?? "not recorded"}</dd>
          </div>
        )}
        {finalModel && (
          <div>
            <dt>Final model</dt>
            <dd className={identClass}>{runs.find((r) => r.id === push?.finalRunId)?.name ?? "not chosen"}</dd>
          </div>
        )}
      </dl>
      {gapTooShort && (
        <p className={m.warn}>
          The gap between train and test is {push?.split?.gapDays} days, but labels look {horizon} days ahead. Test data leaks
          into training until the gap is at least {horizon} days.
        </p>
      )}

      <VersionDetails version={selected} showLoad={false} />

      <PushDialog open={pushing} onClose={() => setPushing(false)} experiment={experiment} section={section} finalModel={finalModel} />
    </>
  );
}
