"use client";

import { useEffect, type ReactNode } from "react";
import { Button, EmptyState } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { useLedger } from "@/data/LedgerProvider";

// Shows its children only when the server answers its health check. Otherwise: checking, or offline.
export function ServerGate({ children }: { children: ReactNode }) {
  const { server, recheckServer } = useLedger();

  // Look again whenever a page behind the gate opens.
  useEffect(() => {
    void recheckServer();
  }, [recheckServer]);

  if (server === "ready") return <>{children}</>;
  if (server === "checking") return <GearSpinner label="Checking the server…" />;
  return (
    <EmptyState title="The server is offline." action={<Button onClick={() => void recheckServer()}>Try again</Button>}>
      <p>The app can&apos;t reach the server right now. It keeps trying every few seconds.</p>
    </EmptyState>
  );
}
