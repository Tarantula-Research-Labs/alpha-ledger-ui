// Read-only questions about the ledger. Pure functions: same answers for in-memory or server data.

import { sameRef } from "@/core/format";
import type { Dataset, DatasetVersion, VersionRef } from "@/core/types";

export function datasetsFor(datasets: Dataset[], experiment: string, section?: string): Dataset[] {
  return datasets.filter((d) => d.experiment === experiment && (section === undefined || d.section === section));
}

export function findDataset(datasets: Dataset[], experiment: string, section: string, name: string): Dataset | undefined {
  return datasets.find((d) => d.experiment === experiment && d.section === section && d.name === name);
}

export function findVersion(datasets: Dataset[], r: VersionRef): DatasetVersion | undefined {
  return findDataset(datasets, r.experiment, r.section, r.dataset)?.versions.find((v) => v.ref.version === r.version);
}

export function latestComplete(d: Dataset): DatasetVersion | undefined {
  return [...d.versions].reverse().find((v) => v.status === "complete");
}

export function lastVersion(d: Dataset): DatasetVersion | undefined {
  return d.versions[d.versions.length - 1];
}

/** Versions that list this one as an input. */
export function usedBy(datasets: Dataset[], r: VersionRef): DatasetVersion[] {
  return datasets.flatMap((d) => d.versions).filter((v) => v.inputs.some((i) => sameRef(i, r)));
}

export function allVersions(datasets: Dataset[], experiment: string): DatasetVersion[] {
  return datasetsFor(datasets, experiment).flatMap((d) => d.versions);
}

export function lastSaved(datasets: Dataset[], experiment: string): string | undefined {
  return allVersions(datasets, experiment)
    .map((v) => v.createdAt)
    .sort()
    .at(-1);
}
