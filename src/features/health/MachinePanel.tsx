"use client";

import { useEffect, useState } from "react";
import { Button, Panel } from "@/core/ui";
import { useLedger, type ServerPhase } from "@/data/LedgerProvider";
import m from "./machine.module.css";

const LABELS: Record<ServerPhase, string> = {
  checking: "Checking…",
  off: "Stopped",
  starting: "Starting…",
  stopping: "Stopping…",
  ready: "Running",
  error: "Couldn't check",
};

// Colour of the dot for each phase (see machine.module.css).
const DOT: Record<ServerPhase, string> = {
  checking: "unknown",
  off: "stopped",
  starting: "pending",
  stopping: "stopping",
  ready: "running",
  error: "unknown",
};

// The EC2 machine behind the server: its state, and a Start or Stop button. Shares its state with every page.
export function MachinePanel() {
  const { server, serverError, startServer, stopServer, recheckServer } = useLedger();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void recheckServer();
  }, [recheckServer]);

  async function act(action: "start" | "stop") {
    if (action === "stop" && !window.confirm("Stop the server? Notebooks and the app can't reach it until you start it again.")) return;
    setBusy(true);
    await (action === "start" ? startServer() : stopServer());
    setBusy(false);
  }

  const button =
    server === "ready" ? (
      <Button onClick={() => act("stop")} disabled={busy}>
        Stop
      </Button>
    ) : server === "off" ? (
      <Button variant="primary" onClick={() => act("start")} disabled={busy}>
        Start
      </Button>
    ) : null;

  return (
    <div className={m.wrap}>
      <Panel title="Machine" icon actions={button}>
        <p className={m.line}>
          <span className={m.dot} data-state={DOT[server]} aria-hidden="true" />
          <strong>ml-research-server</strong>
          <span className={m.state}>{serverError ?? LABELS[server]}</span>
        </p>
        {server === "starting" && <p className={m.hint}>Takes about 1–2 minutes. The server starts on its own once the machine is up.</p>}
      </Panel>
    </div>
  );
}
