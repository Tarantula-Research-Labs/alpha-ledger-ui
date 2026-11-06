import type { VersionRef } from "./types";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});
const countFmt = new Intl.NumberFormat("en-IN");

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) =>
  `${dateFmt.format(new Date(iso))}, ${timeFmt.format(new Date(iso))}`;
export const formatCount = (n: number) => countFmt.format(n);

/** "05_baseline_research" -> "05 Baseline research" */
export function folderLabel(folder: string): string {
  const [num, ...rest] = folder.split("_");
  const words = rest.join(" ");
  return `${num} ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

export const sameRef = (a: VersionRef, b: VersionRef) =>
  a.experiment === b.experiment &&
  a.section === b.section &&
  a.dataset === b.dataset &&
  a.version === b.version;

export function refKey(r: VersionRef): string {
  return `${r.experiment}/${r.section}/${r.dataset}/v${r.version}`;
}

/** Link to a version: its section page with the version opened. */
export function versionHref(r: VersionRef): string {
  return `/experiments/${r.experiment}/${r.section}?dataset=${encodeURIComponent(r.dataset)}&v=${r.version}`;
}

/** Short label; adds the experiment name only when it differs from the one being viewed. */
export function refLabel(r: VersionRef, currentExperiment?: string): string {
  const base = `${r.dataset} v${r.version}`;
  return currentExperiment && r.experiment !== currentExperiment
    ? `${r.experiment} / ${base}`
    : base;
}

export function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value === null || value === undefined) return "not set";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Names allowed for experiments and datasets: they become S3 folder names. */
export const NAME_PATTERN = /^[a-z][a-z0-9_]{2,62}$/;
