// 04 Dataset Validation. Skipped for now.
import type { SectionDefinition } from "@/core/sections";
import { DatasetValidationPanel } from "./Panel";

export const section: SectionDefinition = {
  folder: "04_dataset_validation",
  number: "04",
  title: "Dataset Validation",
  active: false,
  blurb: "Checks on the built features and labels before any model sees them. Skipped for now.",
  Panel: DatasetValidationPanel,
};
