"use client";

import type { SectionPanelProps } from "@/core/sections";
import { MlflowView } from "@/features/mlflow/MlflowView";

export function ModelDevelopmentPanel({ experiment }: SectionPanelProps) {
  return <MlflowView experiment={experiment} section="06_model_development" finalModel />;
}
