"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCount, formatDateTime, formatValue, refLabel, versionHref } from "@/core/format";
import type { DatasetVersion } from "@/core/types";
import { CodeBlock, StatTiles, StatusMark, identClass, type Stat } from "@/core/ui";
import { loadTableSnippet } from "@/features/snippets/snippets";
import v from "./versions.module.css";

// Facts, notes, settings and columns of one version.
export function VersionFacts({ version }: { version: DatasetVersion }) {
  const r = version.ref;
  const settings = Object.entries(version.settings);

  const rows: [Stat, Stat?][] = [
    [
      { label: "Status", value: <StatusMark status={version.status} /> },
      { label: "Saved", value: formatDateTime(version.createdAt) },
    ],
  ];
  if (version.rows !== undefined || version.columns) {
    rows.push([
      { label: "Rows", value: version.rows !== undefined ? formatCount(version.rows) : "–" },
      { label: "Columns", value: version.columns ? version.columns.length : "–" },
    ]);
  }
  rows.push([
    { label: "Code version", value: <span className={identClass}>{version.codeVersion ?? "not recorded"}</span> },
    version.reusedFrom
      ? {
          label: "Reused from",
          value: (
            <Link href={versionHref(version.reusedFrom)} className={`${v.inlineLink} ${identClass}`}>
              {refLabel(version.reusedFrom, r.experiment)}
            </Link>
          ),
        }
      : { label: "Built from", value: version.inputs.length ? `${version.inputs.length} input${version.inputs.length > 1 ? "s" : ""}` : "trl_datalake" },
  ]);

  return (
    <div className={v.details}>
      <StatTiles rows={rows} />

      {version.notes && <p className={v.notesBlock}>{version.notes}</p>}

      {settings.length > 0 && (
        <section className={v.block}>
          <h3 className={v.blockTitle}>Settings</h3>
          <dl className={v.kv}>
            {settings.map(([k, val]) => (
              <div key={k}>
                <dt className={identClass}>{k}</dt>
                <dd>{formatValue(val)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {version.columns && (
        <section className={v.block}>
          <h3 className={v.blockTitle}>Columns</h3>
          <p className={v.columns}>
            {version.columns.map((c) => (
              <span key={c} className={`${v.columnChip} ${identClass}`}>
                {c}
              </span>
            ))}
          </p>
        </section>
      )}

      {version.status === "failed" && (
        <p className={v.warn}>This version never finished saving, so there&apos;s nothing to load. Its number stays used.</p>
      )}
    </div>
  );
}

// The load snippet, pinned to this version by default.
export function VersionLoad({ version }: { version: DatasetVersion }) {
  const [mode, setMode] = useState<"pinned" | "latest">("pinned");
  const r = version.ref;
  if (version.status !== "complete") {
    return <p className={v.warn}>Only complete versions can be loaded.</p>;
  }
  return (
    <div className={v.details}>
      <div className={v.toggle} role="radiogroup" aria-label="Which version the snippet loads">
        <label>
          <input type="radio" name="load-mode" checked={mode === "pinned"} onChange={() => setMode("pinned")} />
          Always v{r.version}
        </label>
        <label>
          <input type="radio" name="load-mode" checked={mode === "latest"} onChange={() => setMode("latest")} />
          Always the latest
        </label>
      </div>
      {mode === "latest" && (
        <p className={v.warn}>
          With latest, rerunning an old notebook picks up newer saves and its results can change. The exact version used is
          still recorded.
        </p>
      )}
      <CodeBlock code={loadTableSnippet(r, mode)} />
    </div>
  );
}
