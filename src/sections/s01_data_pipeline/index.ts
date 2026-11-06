// 01 Data Pipeline. Everything about this section lives in this folder; it never imports another section.
import type { SectionDefinition } from "@/core/sections";
import { DataPipelinePanel } from "./Panel";

export const section: SectionDefinition = {
  folder: "01_data_pipeline",
  number: "01",
  title: "Data Pipeline",
  active: true,
  blurb: "A frozen snapshot of the raw data from trl_datalake. Every later section reads this snapshot, never the live datalake.",
  Panel: DataPipelinePanel,
};
