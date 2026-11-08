"use client";

// Where the UI gets its experiments: from the FastAPI server, through the web app's /api route.
// Datasets and versions stay empty until the server has save and load.

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { NAME_PATTERN } from "@/core/format";
import type { Dataset, Experiment } from "@/core/types";

/** True now that the UI talks to the FastAPI server. Screens use it to hide the "Not saved yet" notices. */
export const CONNECTED_TO_SERVER = true;

/** An experiment as the server sends it. */
interface ServerExperiment {
  name: string;
  description: string;
  created_at: string;
}

const toExperiment = (e: ServerExperiment): Experiment => ({
  name: e.name,
  description: e.description,
  createdAt: e.created_at,
});

const messageOf = (e: unknown) => (e instanceof ApiError ? e.message : "The server can't be reached.");

interface LedgerValue {
  experiments: Experiment[];
  datasets: Dataset[];
  /** True until the experiments list has arrived from the server. */
  loading: boolean;
  /** Why the experiments list couldn't be loaded, or null. */
  loadError: string | null;
  /** Returns an error message, or null when created. */
  createExperiment: (name: string, description: string) => Promise<string | null>;
}

const LedgerContext = createContext<LedgerValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [datasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await apiRequest<ServerExperiment[]>("/experiments");
      setExperiments(list.map(toExperiment));
      setLoadError(null);
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the list once signed in (and again after signing in from the landing page).
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setExperiments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
  }, [isLoaded, isSignedIn, refresh]);

  const createExperiment = useCallback(
    async (name: string, description: string) => {
      if (!NAME_PATTERN.test(name)) {
        return "Use 3 to 63 characters: lowercase letters, digits and underscores, starting with a letter.";
      }
      try {
        await apiRequest("/experiments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, description: description.trim() }),
        });
      } catch (e) {
        return messageOf(e);
      }
      await refresh();
      return null;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ experiments, datasets, loading, loadError, createExperiment }),
    [experiments, datasets, loading, loadError, createExperiment],
  );
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside <LedgerProvider>");
  return value;
}
