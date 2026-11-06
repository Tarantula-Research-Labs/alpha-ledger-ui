"use client";

import type { SectionPanelProps } from "@/core/sections";
import { ButtonLink, EmptyState } from "@/core/ui";

export function DatasetValidationPanel({ experiment }: SectionPanelProps) {
  return (
    <EmptyState
      title="Skipped for now."
      action={<ButtonLink href={`/experiments/${experiment}/05_baseline_research`}>Go to Baseline Research</ButtonLink>}
    >
      <p>Baseline Research reads features and labels straight from Dataset Construction until this section is used.</p>
    </EmptyState>
  );
}
