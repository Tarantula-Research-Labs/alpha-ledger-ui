"use client";

import type { ReactNode } from "react";
import { ButtonLink, EmptyState } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";

// Shows its children only when the experiment exists.
export function ExperimentGuard({ experiment, children }: { experiment: string; children: ReactNode }) {
  const { experiments, loading, loadError } = useLedger();
  if (loading) {
    return <EmptyState title="Loading…" />;
  }
  if (loadError) {
    return (
      <EmptyState title="Couldn't load experiments." action={<ButtonLink href="/experiments">See all experiments</ButtonLink>}>
        <p>{loadError}</p>
      </EmptyState>
    );
  }
  if (!experiments.some((e) => e.name === experiment)) {
    return (
      <EmptyState title={`There's no experiment called ${experiment}.`} action={<ButtonLink href="/experiments">See all experiments</ButtonLink>}>
        <p>Check the name in the address, or pick one from the list.</p>
      </EmptyState>
    );
  }
  return <>{children}</>;
}
