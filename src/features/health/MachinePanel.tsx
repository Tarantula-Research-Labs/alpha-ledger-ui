"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { Button, Panel } from "@/core/ui";
import m from "./machine.module.css";

const LABELS: Record<string, string> = {
  running: "Running",
  stopped: "Stopped",
  pending: "Starting…",
  stopping: "Stopping…",
};

// The EC2 machine behind the server: its state, and a Start or Stop button.
// onRunning is called when the machine has just come up, so the page can re-check the server.
export function MachinePanel({ onRunning }: { onRunning: () => void }) {
  const [state, setState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const look = useCallback(async () => {
    try {
      const r = await apiRequest<{ state: string }>("/power");
      setState((before) => {
        if (before === "pending" && r.state === "running") onRunning();
        return r.state;
      });
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't check the machine.");
    }
  }, [onRunning]);

  useEffect(() => {
    void look();
  }, [look]);

  // While starting or stopping, look again every 5 seconds.
  useEffect(() => {
    if (state !== "pending" && state !== "stopping") return;
    const t = setInterval(() => void look(), 5000);
    return () => clearInterval(t);
  }, [state, look]);

  async function act(action: "start" | "stop") {
    if (action === "stop" && !window.confirm("Stop the server? Notebooks and the app can't reach it until you start it again.")) return;
    setBusy(true);
    try {
      const r = await apiRequest<{ state: string }>("/power", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setState(r.state);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Couldn't ${action} the machine.`);
    } finally {
      setBusy(false);
    }
  }

  const button =
    state === "running" ? (
      <Button onClick={() => act("stop")} disabled={busy}>
        Stop
      </Button>
    ) : state === "stopped" ? (
      <Button variant="primary" onClick={() => act("start")} disabled={busy}>
        Start
      </Button>
    ) : null;

  return (
    <div className={m.wrap}>
      <Panel title="Machine" icon actions={button}>
        <p className={m.line}>
          <span className={m.dot} data-state={state ?? "unknown"} aria-hidden="true" />
          <strong>ml-research-server</strong>
          <span className={m.state}>{error ?? (state ? LABELS[state] ?? state : "Checking…")}</span>
        </p>
        {state === "pending" && <p className={m.hint}>Takes about 1–2 minutes. The server starts on its own once the machine is up.</p>}
      </Panel>
    </div>
  );
}
