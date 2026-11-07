// All sections, in pipeline order. This list is the only place that names them.
// To add a section: create its folder (copy an existing one), then add one line below.

import type { SectionDefinition, SectionMeta } from "@/core/sections";
import { section as s01 } from "./s01_data_pipeline";
import { section as s02 } from "./s02_data_quality";
import { section as s03 } from "./s03_dataset_construction";
import { section as s04 } from "./s04_dataset_validation";
import { section as s05 } from "./s05_baseline_research";
import { section as s06 } from "./s06_model_development";

export const SECTIONS: SectionDefinition[] = [s01, s02, s03, s04, s05, s06];

/** The same list without components, safe to pass to any screen. */
export const SECTION_META: SectionMeta[] = SECTIONS.map(({ folder, number, title, active, blurb, icon }) => ({
  folder,
  number,
  title,
  active,
  blurb,
  icon,
}));

export function findSection(folder: string): SectionDefinition | undefined {
  return SECTIONS.find((s) => s.folder === folder);
}
