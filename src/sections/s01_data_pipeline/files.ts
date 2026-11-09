"use client";

// The files pushed into this experiment's Data Pipeline folder in S3, as the server records them.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import type { VersionStatus } from "@/core/types";
import { useLedger } from "@/data/LedgerProvider";

export interface PipelineFile {
  file: string;
  version: number;
  savedAs: string;
  status: VersionStatus;
  rows: number | null;
  columns: string[];
  note: string;
  sizeBytes: number | null;
  createdAt: string;
}

interface ServerFile {
  file: string;
  version: number;
  saved_as: string;
  status: VersionStatus;
  rows: number | null;
  columns: string[];
  note: string;
  size_bytes: number | null;
  created_at: string;
}

const toFile = (f: ServerFile): PipelineFile => ({
  file: f.file,
  version: f.version,
  savedAs: f.saved_as,
  status: f.status,
  rows: f.rows,
  columns: f.columns,
  note: f.note,
  sizeBytes: f.size_bytes,
  createdAt: f.created_at,
});

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function usePipelineFiles(experiment: string) {
  const { server } = useLedger();
  const [files, setFiles] = useState<PipelineFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiRequest<ServerFile[]>(`/experiments/${experiment}/sections/01_data_pipeline/files`);
      setFiles(list.map(toFile));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The server can't be reached.");
    } finally {
      setLoading(false);
    }
  }, [experiment]);

  useEffect(() => {
    if (server === "ready") void refresh();
  }, [server, refresh]);

  return { files, loading, error, refresh };
}
