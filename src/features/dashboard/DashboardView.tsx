"use client";

import { ButtonLink, EmptyState, PageHeader, Panel } from "@/core/ui";

// Left blank on purpose. It gets designed once the first baseline research is stored
// (a Baseline Research push with mlflow.db), so it can be built around real results.
export function DashboardView() {
  return (
    <>
      <PageHeader title="My Dashboard" />
      <Panel title="Dashboard" icon>
        <EmptyState
          title="Your dashboard comes after the first baseline."
          action={
            <ButtonLink href="/experiments" variant="primary">
              Go to experiments
            </ButtonLink>
          }
        >
          <p>
            Once a Baseline Research push with mlflow.db is stored, this page will be designed around those results. Until
            then, everything lives under Experiments.
          </p>
        </EmptyState>
      </Panel>
    </>
  );
}
