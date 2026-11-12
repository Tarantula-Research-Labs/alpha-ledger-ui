"use client";

// The Drive: files and notes that belong to no single experiment. Files live in S3 under _drive/.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import type { VersionStatus } from "@/core/types";
import { useLedger } from "@/data/LedgerProvider";

export interface DriveFile {
  file: string;
  version: number;
  savedAs: string;
  contentType: string;
  status: VersionStatus;
  sizeBytes: number | null;
  createdAt: string;
}

export interface DriveNote {
  id: number;
  title: string;
  kind: "code" | "markdown";
  language: string;
  body: string;
  createdAt: string;
}

interface ServerFile {
  file: string;
  version: number;
  saved_as: string;
  content_type: string;
  status: VersionStatus;
  size_bytes: number | null;
  created_at: string;
}

interface ServerNote {
  id: number;
  title: string;
  kind: "code" | "markdown";
  language: string;
  body: string;
  created_at: string;
}

const toFile = (f: ServerFile): DriveFile => ({
  file: f.file,
  version: f.version,
  savedAs: f.saved_as,
  contentType: f.content_type,
  status: f.status,
  sizeBytes: f.size_bytes,
  createdAt: f.created_at,
});

const toNote = (n: ServerNote): DriveNote => ({
  id: n.id,
  title: n.title,
  kind: n.kind,
  language: n.language,
  body: n.body,
  createdAt: n.created_at,
});

export const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

// Spaces and odd characters become "_", so the name fits the server's rule
// (starts with a letter or digit; then letters, digits, . _ -; at most 100 characters).
export function safeName(name: string): string {
  let n = name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[^A-Za-z0-9]+/, "");
  if (n.length > 100) {
    const dot = n.lastIndexOf(".");
    const ext = dot > 0 && n.length - dot <= 10 ? n.slice(dot) : "";
    n = n.slice(0, 100 - ext.length) + ext;
  }
  return n || "file";
}

// Which files get a preview: images, and .md files (shown rendered).
export function previewKind(f: DriveFile): "image" | "markdown" | null {
  if (f.contentType.startsWith("image/")) return "image";
  if (/\.(md|markdown)$/i.test(f.file)) return "markdown";
  return null;
}

const filePath = (f: { file: string; version: number }) => `/drive/files/${encodeURIComponent(f.file)}/${f.version}`;

/** A 15-minute link straight to the file in S3. */
export async function downloadUrl(f: DriveFile): Promise<string> {
  const r = await apiRequest<{ download_url: string }>(filePath(f));
  return r.download_url;
}

/** Upload one file: the server gives a 15-minute link, the browser sends the file straight to S3, then the server confirms it. */
export async function uploadToDrive(file: File): Promise<string> {
  const name = safeName(file.name);
  const contentType = file.type || "application/octet-stream";
  const start = await apiRequest<{ version: number; saved_as: string; upload_url: string; upload_headers: Record<string, string> }>(
    `/drive/files/${encodeURIComponent(name)}`,
    { method: "POST", body: JSON.stringify({ content_type: contentType }) },
  );
  let put: Response;
  try {
    put = await fetch(start.upload_url, { method: "PUT", headers: start.upload_headers, body: file });
  } catch {
    throw new ApiError(0, "The upload to S3 failed. Check the bucket's CORS rule.");
  }
  if (!put.ok) throw new ApiError(put.status, `S3 refused the upload (${put.status}).`);
  await apiRequest(`${filePath({ file: name, version: start.version })}/complete`, { method: "POST" });
  return start.saved_as;
}

export async function deleteDriveFile(f: DriveFile): Promise<void> {
  await apiRequest(filePath(f), { method: "DELETE" });
}

export async function createNote(note: { title: string; kind: "code" | "markdown"; language: string; body: string }): Promise<void> {
  await apiRequest("/drive/notes", { method: "POST", body: JSON.stringify(note) });
}

export async function hideNote(id: number): Promise<void> {
  await apiRequest(`/drive/notes/${id}`, { method: "DELETE" });
}

function useList<S, T>(path: string, convert: (s: S) => T) {
  const { server } = useLedger();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiRequest<S[]>(path);
      setItems(list.map(convert));
      setError(null);
    } catch (e) {
      setError(errorText(e, "The server can't be reached."));
    } finally {
      setLoading(false);
    }
  }, [path, convert]);

  useEffect(() => {
    if (server === "ready") void refresh();
  }, [server, refresh]);

  return { items, loading, error, refresh };
}

export const useDriveFiles = () => useList<ServerFile, DriveFile>("/drive/files", toFile);
export const useDriveNotes = () => useList<ServerNote, DriveNote>("/drive/notes", toNote);
