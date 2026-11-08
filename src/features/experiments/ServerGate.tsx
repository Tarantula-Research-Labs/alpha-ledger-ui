"use client";

import { useEffect, type ReactNode } from "react";
import { Button, EmptyState } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { useLedger } from "@/data/LedgerProvider";

// Shows its children only when the server is up. Otherwise: checking, "turn it on?", starting or stopping.
export function ServerGate({ children }: { children: ReactNode }) {
  const { server, serverError, startServer, recheckServer } = useLedger();

  // Look again whenever a page behind the gate opens: the machine may have been stopped elsewhere.
  useEffect(() => {
    void recheckServer();
  }, [recheckServer]);

  if (server === "ready") return <>{children}</>;
  if (server === "checking") return <GearSpinner label="Checking the server…" />;
  if (server === "starting") return <GearSpinner label="Starting the server… about 1–2 minutes" />;
  if (server === "stopping") return <GearSpinner label="The server is stopping. You can turn it on once it has stopped." />;
  if (server === "off") {
    return (
      <EmptyState
        title="The server is off."
        action={
          <Button variant="primary" onClick={() => void startServer()}>
            Turn on the server
          </Button>
        }
      >
        <p>Turn it on to see your experiments. It takes about 1–2 minutes.</p>
        {serverError && <p>{serverError}</p>}
      </EmptyState>
    );
  }
  return (
    <EmptyState title="Couldn't check the server." action={<Button onClick={() => void recheckServer()}>Try again</Button>}>
      <p>{serverError}</p>
    </EmptyState>
  );
}
