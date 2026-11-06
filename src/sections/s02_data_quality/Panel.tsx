"use client";

import type { SectionPanelProps } from "@/core/sections";
import { ButtonLink, EmptyState, Panel } from "@/core/ui";

export function DataQualityPanel({ experiment }: SectionPanelProps) {
  return (
    <Panel title="Data Quality and Integrity" icon>
      <EmptyState
        title="Skipped for now."
        action={<ButtonLink href={`/experiments/${experiment}/03_dataset_construction`}>Go to Dataset Construction</ButtonLink>}
      >
        <p>
          Dataset Construction reads straight from the Data Pipeline snapshot. When this section is used, it will hold a cleaned
          copy of the snapshot, and Dataset Construction will read that instead. Nothing else changes.
        </p>
      </EmptyState>
    </Panel>
  );
}
