"use client";

// Study: the course PDFs and notebooks that live in a GitHub repo. The server keeps an index of the repo
// and caches whatever you open in S3. The repo stays the source of truth.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { useLedger } from "@/data/LedgerProvider";

export type StudyKind = "pdf" | "notebook";

export interface StudyFile {
  path: string;
  kind: StudyKind;
  sizeBytes: number;
  updatedAt: string;
  /** "new" = appeared in a later sync; "updated" = changed on GitHub since it was last opened. */
  badge: "new" | "updated" | null;
  cached: boolean;
}

export interface StudyTree {
  lastSyncedAt: string | null;
  files: StudyFile[];
}

export interface SyncResult {
  firstSync: boolean;
  total: number;
  new: number;
  updated: number;
  removed: number;
}

export interface OpenedFile {
  /** A 15-minute link to the PDF, or to the notebook's HTML page. */
  url: string;
  kind: StudyKind;
}

interface ServerTree {
  last_synced_at: string | null;
  files: { path: string; kind: StudyKind; size_bytes: number; updated_at: string; badge: "new" | "updated" | null; cached: boolean }[];
}

interface ServerSync {
  first_sync: boolean;
  total: number;
  new: number;
  updated: number;
  removed: number;
}

export const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

const toTree = (t: ServerTree): StudyTree => ({
  lastSyncedAt: t.last_synced_at,
  files: t.files.map((f) => ({
    path: f.path,
    kind: f.kind,
    sizeBytes: f.size_bytes,
    updatedAt: f.updated_at,
    badge: f.badge,
    cached: f.cached,
  })),
});

/** Compare the GitHub repo with the server's index. Downloads nothing. */
export async function syncStudy(): Promise<SyncResult> {
  const r = await apiRequest<ServerSync>("/study/sync", { method: "POST" });
  return { firstSync: r.first_sync, total: r.total, new: r.new, updated: r.updated, removed: r.removed };
}

/** Make sure the server has the current copy of a file in S3 (the first open copies it from GitHub), and get a link to it. */
export async function openStudyFile(path: string): Promise<OpenedFile> {
  const r = await apiRequest<{ url: string; kind: StudyKind }>(`/study/open?path=${encodeURIComponent(path)}`);
  return { url: r.url, kind: r.kind };
}

export function useStudyTree() {
  const { server } = useLedger();
  const [tree, setTree] = useState<StudyTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTree(toTree(await apiRequest<ServerTree>("/study/tree")));
      setError(null);
    } catch (e) {
      setError(errorText(e, "The server can't be reached."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (server === "ready") void refresh();
  }, [server, refresh]);

  /** A file was just opened: the server has marked it seen and cached, so drop its badge here too. */
  const markOpened = useCallback((path: string) => {
    setTree((t) => (t ? { ...t, files: t.files.map((f) => (f.path === path ? { ...f, badge: null, cached: true } : f)) } : t));
  }, []);

  return { tree, loading, error, refresh, markOpened };
}

/* ---------- The folder tree, built from the files' paths ---------- */

export interface Folder {
  name: string;
  /** Path of the folder itself, e.g. "Lecture Notes and Notebooks/Course 1". The root has "". */
  path: string;
  folders: Folder[];
  files: StudyFile[];
  /** How many files with a New / Updated badge sit anywhere below this folder. */
  flagged: number;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
export const folderOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

export function buildFolders(files: StudyFile[]): Folder {
  const root: Folder = { name: "", path: "", folders: [], files: [], flagged: 0 };
  for (const f of files) {
    let node = root;
    const parts = f.path.split("/").slice(0, -1);
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let next = node.folders.find((x) => x.path === path);
      if (!next) {
        next = { name: part, path, folders: [], files: [], flagged: 0 };
        node.folders.push(next);
      }
      node = next;
    });
    node.files.push(f);
  }
  const finish = (n: Folder): number => {
    n.folders.sort((a, b) => byName(a.name, b.name));
    n.files.sort((a, b) => byName(fileName(a.path), fileName(b.path)));
    n.flagged = n.files.filter((f) => f.badge).length + n.folders.reduce((sum, x) => sum + finish(x), 0);
    return n.flagged;
  };
  finish(root);
  return root;
}

/** Folders to open at the start: a chain of folders that each hold just one folder (so a lone top folder is already open). */
export function startOpen(root: Folder): Set<string> {
  const open = new Set<string>();
  let node = root;
  while (node.folders.length === 1 && node.files.length === 0) {
    node = node.folders[0];
    open.add(node.path);
  }
  return open;
}
