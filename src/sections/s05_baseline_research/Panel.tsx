"use client";

import type { SectionPanelProps } from "@/core/sections";
import { MlflowView } from "@/features/mlflow/MlflowView";

export function BaselineResearchPanel({ experiment }: SectionPanelProps) {
  return <MlflowView experiment={experiment} section="05_baseline_research" finalModel={false} />;
}
