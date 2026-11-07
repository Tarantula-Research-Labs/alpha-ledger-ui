"use client";

// Where the UI gets its experiments and versions.
// Today: held in memory in this browser tab only (nothing is saved; a reload starts empty).
// Next step: each function here calls the FastAPI server instead; no screen needs to change.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { NAME_PATTERN } from "@/core/format";
import type { Dataset, Experiment, VersionRef } from "@/core/types";
import { findDataset } from "./queries";

/** False until the UI talks to the FastAPI server. Screens use it to say nothing is saved yet. */
export const CONNECTED_TO_SERVER = false;

const DATA_PIPELINE = "01_data_pipeline";

interface LedgerValue {
  experiments: Experiment[];
  datasets: Dataset[];
  /** Returns an error message, or null when created. */
  createExperiment: (name: string, description: string) => string | null;
  /** Data Pipeline "Same as a past experiment": saves a new snapshot version that points to the reused one. */
  reuseSnapshot: (experiment: string, from: VersionRef) => VersionRef;
}

const LedgerContext = createContext<LedgerValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const createExperiment = useCallback(
    (name: string, description: string) => {
      if (!NAME_PATTERN.test(name)) {
        return "Use 3 to 63 characters: lowercase letters, digits and underscores, starting with a letter.";
      }
      if (experiments.some((e) => e.name === name)) return `An experiment called ${name} already exists.`;
      setExperiments((prev) => [...prev, { name, description: description.trim(), createdAt: new Date().toISOString() }]);
      return null;
    },
    [experiments],
  );

  const reuseSnapshot = useCallback(
    (experiment: string, from: VersionRef) => {
      const source = findDataset(datasets, from.experiment, from.section, from.dataset)?.versions.find(
        (v) => v.ref.version === from.version,
      );
      const existing = findDataset(datasets, experiment, DATA_PIPELINE, "snapshot");
      const nextVersion = (existing?.versions.at(-1)?.ref.version ?? 0) + 1;
      const newRef: VersionRef = { experiment, section: DATA_PIPELINE, dataset: "snapshot", version: nextVersion };
      const newVersion = {
        ref: newRef,
        status: "complete" as const,
        createdAt: new Date().toISOString(),
        rows: source?.rows,
        columns: source?.columns,
        inputs: [from],
        reusedFrom: from,
        settings: { source: "same as a past experiment" },
        notes: "Reused. Nothing re-fetched.",
      };
      setDatasets((prev) =>
        existing
          ? prev.map((d) => (d === existing ? { ...d, versions: [...d.versions, newVersion] } : d))
          : [...prev, { experiment, section: DATA_PIPELINE, name: "snapshot", kind: "table", versions: [newVersion] }],
      );
      return newRef;
    },
    [datasets],
  );

  const value = useMemo(
    () => ({ experiments, datasets, createExperiment, reuseSnapshot }),
    [experiments, datasets, createExperiment, reuseSnapshot],
  );
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside <LedgerProvider>");
  return value;
}
