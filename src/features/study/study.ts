"use client";

// Study: the course PDFs and notebooks that live in a GitHub repo (MScFE only), and the files you upload into
// any section. The server keeps an index of the repo and caches whatever you open in S3. The repo stays the
// source of truth for its files; an uploaded file lives only in S3.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { useLedger } from "@/data/LedgerProvider";

export type StudyKind = "pdf" | "notebook" | "image" | "text";
export type StudySection = "mscfe" | "machine-learning" | "deep-learning" | "quantitative-research";

// The Study sections. To add one: one line here, plus its page under app/(hub)/study.
// Only MScFE reads a GitHub repo; every section takes uploads.
export const STUDY_SECTIONS: { id: StudySection; label: string; href: string; hasRepo: boolean }[] = [
  { id: "mscfe", label: "MScFE", href: "/study", hasRepo: true },
  { id: "machine-learning", label: "Machine Learning", href: "/study/machine-learning", hasRepo: false },
  { id: "deep-learning", label: "Deep Learning", href: "/study/deep-learning", hasRepo: false },
  { id: "quantitative-research", label: "Quantitative Research", href: "/study/quantitative-research", hasRepo: false },
];

/** In MScFE, uploaded files sit in this folder at the top of the tree, apart from the course repo's files. */
export const UPLOADS_FOLDER = "Uploads";

export interface StudyFile {
  /** Where the file sits in the tree. An upload in MScFE is under "Uploads/". */
  path: string;
  kind: StudyKind;
  sizeBytes: number;
  updatedAt: string;
  /** "new" = appeared in a later sync; "updated" = changed on GitHub since it was last opened. */
  badge: "new" | "updated" | null;
  cached: boolean;
  uploaded: boolean;
  /** An upload's path inside its section (what the server knows it by); null for a repo file. */
  uploadPath: string | null;
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
  /** A 15-minute link to the PDF, image or text file, or to the notebook's HTML page. */
  url: string;
  kind: StudyKind;
}

interface ServerTree {
  last_synced_at: string | null;
  files: { path: string; kind: StudyKind; size_bytes: number; updated_at: string; badge: "new" | "updated" | null; cached: boolean }[];
}

interface ServerUpload {
  path: string;
  kind: StudyKind;
  size_bytes: number;
  created_at: string;
  version: number;
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
    uploaded: false,
    uploadPath: null,
  })),
});

const toUploaded = (section: StudySection, u: ServerUpload): StudyFile => ({
  path: section === "mscfe" ? `${UPLOADS_FOLDER}/${u.path}` : u.path,
  kind: u.kind,
  sizeBytes: u.size_bytes,
  updatedAt: u.created_at,
  badge: null,
  cached: true,
  uploaded: true,
  uploadPath: u.path,
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

/* ---------- Uploads ---------- */

export const MAX_UPLOAD_BYTES = 100_000_000;
const UPLOAD_TYPES = [".pdf", ".ipynb", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".md"];
export const UPLOAD_ACCEPT = UPLOAD_TYPES.join(",");

/** The file's name as the server accepts it: other characters become "_", and it is kept to 120 characters. */
export function studyName(name: string): string {
  let n = name.trim().replace(/[^\p{L}\p{N}_ .,()&'+\u2013-]/gu, "_").replace(/^[^\p{L}\p{N}_]+/u, "");
  if (n.length > 120) {
    const dot = n.lastIndexOf(".");
    const ext = dot > 0 && n.length - dot <= 10 ? n.slice(dot) : "";
    n = n.slice(0, 120 - ext.length) + ext;
  }
  return n;
}

/** Send one file into a section: ask the server for an upload link, send the file straight to S3, then confirm. */
export async function uploadStudyFile(section: StudySection, folder: string, file: File): Promise<StudyFile> {
  const filename = studyName(file.name);
  const dot = filename.lastIndexOf(".");
  if (dot < 1 || !UPLOAD_TYPES.includes(filename.slice(dot).toLowerCase())) {
    throw new ApiError(400, "Only PDF, notebook (.ipynb), image (png, jpg, gif, webp) and text (.txt, .md) files can be uploaded.");
  }
  if (file.size === 0) throw new ApiError(400, "The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "That file is over the 100 MB limit.");

  const start = await apiRequest<{ version: number; path: string; upload_url: string; upload_headers: Record<string, string> }>(
    "/study/uploads/start",
    { method: "POST", body: JSON.stringify({ section, folder, filename, size_bytes: file.size }) },
  );
  let put: Response;
  try {
    put = await fetch(start.upload_url, { method: "PUT", headers: start.upload_headers, body: file });
  } catch {
    throw new ApiError(0, "The upload to S3 failed. Check the bucket's CORS rule.");
  }
  if (!put.ok) throw new ApiError(put.status, `S3 refused the upload (${put.status}).`);
  const done = await apiRequest<ServerUpload>("/study/uploads/complete", {
    method: "POST",
    body: JSON.stringify({ section, path: start.path, version: start.version }),
  });
  return toUploaded(section, done);
}

/** A 15-minute link to an uploaded file. A notebook is converted to a page the first time. */
export async function openUpload(section: StudySection, uploadPath: string): Promise<OpenedFile> {
  const r = await apiRequest<{ url: string; kind: StudyKind }>(`/study/uploads/open?section=${section}&path=${encodeURIComponent(uploadPath)}`);
  return { url: r.url, kind: r.kind };
}

/** Hide an uploaded file from the section. Its copy in S3 stays. */
export async function removeUpload(section: StudySection, uploadPath: string): Promise<void> {
  await apiRequest(`/study/uploads?section=${section}&path=${encodeURIComponent(uploadPath)}`, { method: "DELETE" });
}

/* ---------- Ask Gemini about the open file ---------- */

/** What a question is about: a course file from the repo, or an upload (known to the server by its path in the section). */
export interface AskTarget {
  section: StudySection;
  source: "repo" | "upload";
  path: string;
}

export const askTargetOf = (section: StudySection, file: StudyFile): AskTarget =>
  file.uploadPath !== null ? { section, source: "upload", path: file.uploadPath } : { section, source: "repo", path: file.path };

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  at: string;
  /** The version of the file the message was about; compared with the file's current one to spot outdated answers. */
  sig: string;
  /** Model messages: which model answered, and whether a lite model stood in because the main ones were busy. */
  model?: string;
  fallback?: boolean;
  /** User messages: the pages the question was limited to, the page being read and the passage selected. */
  firstPage?: number;
  lastPage?: number;
  page?: number;
  quote?: string;
}

interface ServerMessage {
  role: "user" | "model";
  text: string;
  at: string;
  sig: string;
  model?: string;
  fallback?: boolean;
  first_page?: number;
  last_page?: number;
  page?: number;
  quote?: string;
}

const toMessage = (m: ServerMessage): ChatMessage => ({
  role: m.role,
  text: m.text,
  at: m.at,
  sig: m.sig,
  model: m.model,
  fallback: m.fallback,
  firstPage: m.first_page,
  lastPage: m.last_page,
  page: m.page,
  quote: m.quote,
});

const targetQuery = (t: AskTarget) => `section=${t.section}&source=${t.source}&path=${encodeURIComponent(t.path)}`;

/** The saved conversation about a file, and the file's current version. */
export async function loadChat(t: AskTarget): Promise<{ messages: ChatMessage[]; sig: string }> {
  const r = await apiRequest<{ messages: ServerMessage[]; current_sig: string }>(`/study/chat?${targetQuery(t)}`);
  return { messages: r.messages.map(toMessage), sig: r.current_sig };
}

/** Ask a question about a file (all of it, or the given pages of a PDF). The answer can take up to a minute when Gemini is busy. */
export async function askStudy(t: AskTarget, question: string, pages?: { first: number; last: number }): Promise<ChatMessage> {
  const r = await apiRequest<{ message: ServerMessage }>("/study/ask", {
    method: "POST",
    body: JSON.stringify({ ...t, question, first_page: pages?.first, last_page: pages?.last }),
  });
  return toMessage(r.message);
}

/** Start a new chat about a file. The server keeps a dated copy of the old one. */
export async function clearChat(t: AskTarget): Promise<void> {
  await apiRequest(`/study/chat?${targetQuery(t)}`, { method: "DELETE" });
}

/** Everything one section shows: the repo's files (MScFE only) and the uploads. */
export function useStudyFiles(section: StudySection) {
  const { server } = useLedger();
  const hasRepo = STUDY_SECTIONS.find((x) => x.id === section)?.hasRepo ?? false;
  const [tree, setTree] = useState<StudyTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [repo, up] = await Promise.all([
        hasRepo ? apiRequest<ServerTree>("/study/tree") : Promise.resolve(null),
        apiRequest<{ files: ServerUpload[] }>(`/study/uploads?section=${section}`),
      ]);
      const base = repo ? toTree(repo) : { lastSyncedAt: null, files: [] };
      setTree({ ...base, files: [...base.files, ...up.files.map((u) => toUploaded(section, u))] });
      setError(null);
    } catch (e) {
      setError(errorText(e, "The server can't be reached."));
    } finally {
      setLoading(false);
    }
  }, [section, hasRepo]);

  useEffect(() => {
    setTree(null);
    setLoading(true);
    if (server === "ready") void refresh();
  }, [server, refresh]);

  /** A file was just opened: the server has marked it seen and cached, so drop its badge here too. */
  const markOpened = useCallback((path: string) => {
    setTree((t) => (t ? { ...t, files: t.files.map((f) => (f.path === path ? { ...f, badge: null, cached: true } : f)) } : t));
  }, []);

  // The server's list of uploads can lag a moment behind, so an upload or a removal is applied here at once.
  const addUploaded = useCallback((file: StudyFile) => {
    setTree((t) => (t ? { ...t, files: [...t.files.filter((f) => f.path !== file.path), file] } : t));
  }, []);
  const dropUploaded = useCallback((path: string) => {
    setTree((t) => (t ? { ...t, files: t.files.filter((f) => f.path !== path) } : t));
  }, []);

  return { tree, loading, error, refresh, markOpened, addUploaded, dropUploaded };
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
    // The Uploads folder comes first at the top of the tree; everything else is by name.
    n.folders.sort((a, b) => Number(b.path === UPLOADS_FOLDER) - Number(a.path === UPLOADS_FOLDER) || byName(a.name, b.name));
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
