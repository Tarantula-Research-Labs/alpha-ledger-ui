// 03 Dataset Construction. Everything about this section lives in this folder.
import type { SectionDefinition } from "@/core/sections";
import { DatasetConstructionPanel } from "./Panel";

export const section: SectionDefinition = {
  folder: "03_dataset_construction",
  number: "03",
  title: "Dataset Construction",
  active: true,
  icon: "layers",
  blurb: "Features, one dataset per group, and labels. Built in your notebook from the snapshot, saved separately, joined only when loaded.",
  Panel: DatasetConstructionPanel,
};
