"use client";

// Where the UI gets its experiments: from the FastAPI server, through the web app's /api route.
// Before loading them it checks that the server answers (/api/health). If it doesn't, screens say it is offline.
// Datasets and versions stay empty until the server has save and load.

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiGet, apiRequest } from "@/core/api";
import { NAME_PATTERN } from "@/core/format";
import type { Dataset, Experiment } from "@/core/types";

/** True now that the UI talks to the FastAPI server. Screens use it to hide the "Not saved yet" notices. */
export const CONNECTED_TO_SERVER = true;

/** Where the server is: being checked, ready (answering /health), or offline. */
export type ServerPhase = "checking" | "ready" | "offline";

/** How often to look again while the server is offline. */
const POLL_MS = 5000;

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
  /** Where the server is. Experiments load only once it is "ready". */
  server: ServerPhase;
  /** Ask the server whether it answers. */
  recheckServer: () => Promise<void>;
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
  const [server, setServer] = useState<ServerPhase>("checking");

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

  const recheckServer = useCallback(async () => {
    const health = await apiGet<{ status: string } | null>("/health").catch(() => null);
    setServer(health?.status === "ok" ? "ready" : "offline");
  }, []);

  // Once signed in, check the server first (and again after signing in from the landing page).
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setExperiments([]);
      setLoading(false);
      setServer("checking");
      return;
    }
    void recheckServer();
  }, [isLoaded, isSignedIn, recheckServer]);

  // While the server is offline, look again every few seconds.
  useEffect(() => {
    if (server !== "offline") return;
    const t = setInterval(() => void recheckServer(), POLL_MS);
    return () => clearInterval(t);
  }, [server, recheckServer]);

  // When the server becomes ready, load the experiments.
  useEffect(() => {
    if (server !== "ready") return;
    setLoading(true);
    void refresh();
  }, [server, refresh]);

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
    () => ({ experiments, datasets, loading, loadError, server, recheckServer, createExperiment }),
    [experiments, datasets, loading, loadError, server, recheckServer, createExperiment],
  );
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside <LedgerProvider>");
  return value;
}
