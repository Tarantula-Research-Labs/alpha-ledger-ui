"use client";

import { useState } from "react";
import { formatCount, formatDateTime, formatValue, refLabel, versionHref } from "@/core/format";
import type { DatasetVersion } from "@/core/types";
import { CodeBlock, StatusMark, identClass } from "@/core/ui";
import { Lineage } from "@/features/lineage/Lineage";
import { loadTableSnippet } from "@/features/snippets/snippets";
import Link from "next/link";
import v from "./versions.module.css";

// Everything about one version: facts, settings, columns, lineage and how to load it.
export function VersionDetails({ version, showLoad = true }: { version: DatasetVersion; showLoad?: boolean }) {
  const [mode, setMode] = useState<"pinned" | "latest">("pinned");
  const r = version.ref;
  const settings = Object.entries(version.settings);

  return (
    <div className={v.details}>
      <dl className={v.facts}>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusMark status={version.status} />
          </dd>
        </div>
        <div>
          <dt>Saved</dt>
          <dd>{formatDateTime(version.createdAt)}</dd>
        </div>
        {version.rows !== undefined && (
          <div>
            <dt>Rows</dt>
            <dd>{formatCount(version.rows)}</dd>
          </div>
        )}
        {version.columns && (
          <div>
            <dt>Columns</dt>
            <dd>{version.columns.length}</dd>
          </div>
        )}
        <div>
          <dt>Code version</dt>
          <dd className={identClass}>{version.codeVersion ?? "not recorded"}</dd>
        </div>
        {version.reusedFrom && (
          <div>
            <dt>Reused from</dt>
            <dd>
              <Link href={versionHref(version.reusedFrom)} className={`${v.inlineLink} ${identClass}`}>
                {refLabel(version.reusedFrom, r.experiment)}
              </Link>
            </dd>
          </div>
        )}
      </dl>

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
          <p className={`${v.columns} ${identClass}`}>{version.columns.join("  ")}</p>
        </section>
      )}

      <section className={v.block}>
        <h3 className={v.blockTitle}>Lineage</h3>
        <Lineage of={r} />
      </section>

      {showLoad && version.status === "complete" && (
        <section className={v.block}>
          <h3 className={v.blockTitle}>Load in a notebook</h3>
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
              With latest, rerunning an old notebook picks up newer saves and its results can change. The exact version used
              is still recorded.
            </p>
          )}
          <CodeBlock code={loadTableSnippet(r, mode)} />
        </section>
      )}
      {version.status === "failed" && (
        <p className={v.warn}>This version never finished saving, so there&apos;s nothing to load. Its number stays used.</p>
      )}
    </div>
  );
}
