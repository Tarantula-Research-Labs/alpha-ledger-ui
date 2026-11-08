"use client";

// Where the UI gets its experiments: from the FastAPI server, through the web app's /api route.
// Before loading them it checks the EC2 machine. If it's off, screens ask whether to turn it on.
// Datasets and versions stay empty until the server has save and load.

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiGet, apiRequest } from "@/core/api";
import { NAME_PATTERN } from "@/core/format";
import type { Dataset, Experiment } from "@/core/types";

/** True now that the UI talks to the FastAPI server. Screens use it to hide the "Not saved yet" notices. */
export const CONNECTED_TO_SERVER = true;

/** Where the server is: being checked, off, starting, stopping, ready (machine up and server answering), or error. */
export type ServerPhase = "checking" | "off" | "starting" | "stopping" | "ready" | "error";

/** How often to look again while the machine is starting or stopping. */
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
  /** Why the server or machine couldn't be checked, started or stopped, or null. */
  serverError: string | null;
  /** Ask AWS about the machine and the server whether it answers. */
  recheckServer: () => Promise<void>;
  /** Turn the EC2 machine on or off. */
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
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
  const [serverError, setServerError] = useState<string | null>(null);

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
    try {
      const { state } = await apiRequest<{ state: string }>("/power");
      setServerError(null);
      if (state === "stopped") return setServer("off");
      if (state === "pending") return setServer("starting");
      if (state === "stopping" || state === "shutting-down") return setServer("stopping");
      if (state !== "running") {
        setServerError(`The machine is ${state}.`);
        return setServer("error");
      }
      // The machine is up. The server program may still be starting.
      const health = await apiGet<{ status: string } | null>("/health").catch(() => null);
      setServer(health?.status === "ok" ? "ready" : "starting");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Couldn't check the machine.");
      setServer("error");
    }
  }, []);

  const power = useCallback(async (action: "start" | "stop") => {
    try {
      await apiRequest("/power", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setServerError(null);
      setServer(action === "start" ? "starting" : "stopping");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : `Couldn't ${action} the machine.`);
    }
  }, []);
  const startServer = useCallback(() => power("start"), [power]);
  const stopServer = useCallback(() => power("stop"), [power]);

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

  // While the machine is starting or stopping, look again every few seconds.
  useEffect(() => {
    if (server !== "starting" && server !== "stopping") return;
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
    () => ({ experiments, datasets, loading, loadError, server, serverError, recheckServer, startServer, stopServer, createExperiment }),
    [experiments, datasets, loading, loadError, server, serverError, recheckServer, startServer, stopServer, createExperiment],
  );
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("useLedger must be used inside <LedgerProvider>");
  return value;
}
