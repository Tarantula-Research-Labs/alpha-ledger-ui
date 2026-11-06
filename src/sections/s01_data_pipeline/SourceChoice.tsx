"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate, versionHref } from "@/core/format";
import { Button, CodeBlock, Dialog, Field, inputClass } from "@/core/ui";
import p from "@/core/ui/panel.module.css";
import { useLedger } from "@/data/LedgerProvider";
import { findDataset } from "@/data/queries";
import { datalakeSnippet, saveTableSnippet } from "@/features/snippets/snippets";

const FOLDER = "01_data_pipeline";

// "Same as a past experiment" or "Fresh": the question Data Pipeline asks first.
export function SourceChoice({ open, onClose, experiment }: { open: boolean; onClose: () => void; experiment: string }) {
  const router = useRouter();
  const { experiments, datasets, reuseSnapshot } = useLedger();
  const [mode, setMode] = useState<"past" | "fresh">("past");

  // Past experiments that have at least one complete snapshot.
  const sources = useMemo(
    () =>
      experiments
        .filter((e) => e.name !== experiment)
        .map((e) => ({ name: e.name, versions: (findDataset(datasets, e.name, FOLDER, "snapshot")?.versions ?? []).filter((v) => v.status === "complete") }))
        .filter((e) => e.versions.length > 0),
    [experiments, datasets, experiment],
  );

  const [fromExp, setFromExp] = useState("");
  const [fromVersion, setFromVersion] = useState(0);
  const chosenExp = sources.find((s) => s.name === fromExp) ?? sources[0];
  const versions = chosenExp?.versions ?? [];
  const chosenVersion = versions.find((v) => v.ref.version === fromVersion) ?? versions.at(-1);

  function reuse() {
    if (!chosenVersion) return;
    const created = reuseSnapshot(experiment, chosenVersion.ref);
    onClose();
    router.replace(versionHref(created), { scroll: false });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Where does this experiment's data come from?" wide>
      <div className={p.choices} role="radiogroup" aria-label="Data source">
        <label className={p.choice}>
          <input type="radio" name="source" checked={mode === "past"} onChange={() => setMode("past")} />
          <span className={p.choiceTitle}>Same as a past experiment</span>
          <span className={p.choiceText}>Reuse a saved snapshot. Identical data, nothing re-fetched, so results compare fairly.</span>
        </label>
        <label className={p.choice}>
          <input type="radio" name="source" checked={mode === "fresh"} onChange={() => setMode("fresh")} />
          <span className={p.choiceTitle}>Fresh</span>
          <span className={p.choiceText}>Pull the latest from trl_datalake in your notebook and save it as a new snapshot.</span>
        </label>
      </div>

      {mode === "past" &&
        (sources.length === 0 ? (
          <p className={p.muted}>No other experiment has a snapshot yet. Choose Fresh to pull data for this one.</p>
        ) : (
          <>
            <div className={p.row}>
              <Field label="Experiment" id="src-exp">
                <select
                  id="src-exp"
                  className={inputClass}
                  value={chosenExp?.name}
                  onChange={(e) => {
                    setFromExp(e.target.value);
                    setFromVersion(0);
                  }}
                >
                  {sources.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Snapshot version" id="src-ver">
                <select id="src-ver" className={inputClass} value={chosenVersion?.ref.version} onChange={(e) => setFromVersion(Number(e.target.value))}>
                  {[...versions].reverse().map((v) => (
                    <option key={v.ref.version} value={v.ref.version}>
                      v{v.ref.version}, {formatDate(v.createdAt)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {chosenVersion?.notes && <p className={p.detailsText}>{chosenVersion.notes}</p>}
            <div className={p.footer}>
              <Button variant="quiet" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={reuse}>
                Reuse snapshot
              </Button>
            </div>
          </>
        ))}

      {mode === "fresh" && (
        <div className={p.stack}>
          <p className={p.muted}>1. Read from the datalake in your notebook.</p>
          <CodeBlock code={datalakeSnippet()} />
          <p className={p.muted}>2. Save it as this experiment&apos;s snapshot. Every later section reads this frozen copy.</p>
          <CodeBlock code={saveTableSnippet(experiment, FOLDER, "snapshot")} />
          <div className={p.footer}>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
