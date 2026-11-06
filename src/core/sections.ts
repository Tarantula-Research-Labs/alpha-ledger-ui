import type { ComponentType } from "react";

// The shape every section must have to plug into the UI.
// The list of sections itself lives in src/sections/registry.ts.

export interface SectionMeta {
  folder: string; // same folder name as in S3, e.g. "01_data_pipeline"
  number: string; // "01"
  title: string;
  active: boolean; // false = exists but skipped for now
  blurb: string; // one line: what this section holds
}

export interface SectionPanelProps {
  experiment: string;
}

export interface SectionDefinition extends SectionMeta {
  Panel: ComponentType<SectionPanelProps>;
}
