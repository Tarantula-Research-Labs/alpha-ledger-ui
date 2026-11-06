// 02 Data Quality and Integrity. Skipped for now.
import type { SectionDefinition } from "@/core/sections";
import { DataQualityPanel } from "./Panel";

export const section: SectionDefinition = {
  folder: "02_data_quality",
  number: "02",
  title: "Data Quality and Integrity",
  active: false,
  blurb: "Checks and cleaning of the snapshot. Skipped for now.",
  Panel: DataQualityPanel,
};
