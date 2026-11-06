// 05 Baseline Research. Everything about this section lives in this folder.
import type { SectionDefinition } from "@/core/sections";
import { BaselineResearchPanel } from "./Panel";

export const section: SectionDefinition = {
  folder: "05_baseline_research",
  number: "05",
  title: "Baseline Research",
  active: true,
  blurb: "IC checks, rule-based momentum, Ridge and a decision tree, run in MLflow on your laptop and pushed here when done.",
  Panel: BaselineResearchPanel,
};
