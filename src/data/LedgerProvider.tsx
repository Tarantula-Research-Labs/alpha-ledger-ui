"use client";

// Where the UI gets its experiments and versions.
// Today: held in memory in this browser tab only (nothing is saved; a reload starts empty).
// Next step: each function here calls the FastAPI server instead; no screen needs to change.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { NAME_PATTERN } from "@/core/format";
import type { Dataset, Experiment } from "@/core/types";

/** False until the UI talks to the FastAPI server. Screens use it to say nothing is saved yet. */
export const CONNECTED_TO_SERVER = false;

interface LedgerValue {
  experiments: Experiment[];
  datasets: Dataset[];
  /** Returns an error message, or null when created. */
  createExperiment: (name: string, description: string) => string | null;
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

  const value = useMemo(
    () => ({ experiments, datasets, createExperiment }),
    [experiments, datasets, createExperiment],
  );
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside <LedgerProvider>");
  return value;
}
