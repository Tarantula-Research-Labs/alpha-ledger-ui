import type { ComponentType } from "react";

// The shape every section must have to plug into the UI.
// The list of sections itself lives in src/sections/registry.ts.

export interface SectionMeta {
  folder: string; // same folder name as in S3, e.g. "01_data_pipeline"
  number: string; // "01"
  title: string;
  active: boolean; // false = exists but skipped for now
  blurb: string; // one line: what this section holds
  icon: string; // icon name from core/ui/icons, e.g. "database"
}

export interface SectionPanelProps {
  experiment: string;
  /** This section and the full list, for panels that draw their own header (see ownsHeader). */
  section?: SectionMeta;
  sections?: SectionMeta[];
}

export interface SectionDefinition extends SectionMeta {
  Panel: ComponentType<SectionPanelProps>;
  /** true = the panel draws the section header and drafts itself (e.g. to hide them in a dashboard view). */
  ownsHeader?: boolean;
}
