"use client";

import { useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { formatCount, formatDate } from "@/core/format";
import { Button, Panel, StatusMark, identClass } from "@/core/ui";
import { retrievePipelineFileSnippet } from "@/features/snippets/snippets";
import { formatBytes, type PipelineFile } from "./files";
import f from "./files.module.css";

// Download: ask the server for a 15-minute link, then the browser downloads straight from S3.
function DownloadButton({ experiment, file }: { experiment: string; file: PipelineFile }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const r = await apiRequest<{ download_url: string }>(
        `/experiments/${experiment}/sections/01_data_pipeline/files/${encodeURIComponent(file.file)}/${file.version}`,
      );
      const a = document.createElement("a");
      a.href = r.download_url;
      a.download = file.savedAs;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Couldn't get the download link.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button onClick={() => void download()} disabled={busy}>
      {busy ? "Getting…" : "Download"}
    </Button>
  );
}

// Copy code: a retrieve snippet pinned to exactly this file and version.
function CopyCodeButton({ experiment, file }: { experiment: string; file: PipelineFile }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(retrievePipelineFileSnippet(experiment, file.file, file.version));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("Couldn't copy to the clipboard.");
    }
  }
  return <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy code"}</Button>;
}

// Every file in this experiment's Data Pipeline folder in S3, newest first.
export function SavedFiles({
  experiment,
  files,
  loading,
  error,
  onRefresh,
}: {
  experiment: string;
  files: PipelineFile[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <Panel
      title="Saved files"
      icon
      flush
      actions={
        <Button onClick={onRefresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      }
    >
      {error ? (
        <p className={f.empty}>{error}</p>
      ) : !loading && files.length === 0 ? (
        <p className={f.empty}>No files yet. Use step 3 below to push one.</p>
      ) : (
        <div className={f.scroll}>
          <table className={f.table}>
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">Version</th>
                <th scope="col">Rows</th>
                <th scope="col">Columns</th>
                <th scope="col">Size</th>
                <th scope="col">Saved</th>
                <th scope="col">Status</th>
                <th scope="col">Download</th>
                <th scope="col">Code</th>
              </tr>
            </thead>
            <tbody>
              {files.map((x) => (
                <tr key={`${x.file}-${x.version}`}>
                  <th scope="row">
                    <span className={identClass}>{x.savedAs}</span>
                    {x.note && <span className={f.note}>{x.note}</span>}
                  </th>
                  <td>v{x.version}</td>
                  <td>{x.rows !== null ? formatCount(x.rows) : "–"}</td>
                  <td>{x.columns.length || "–"}</td>
                  <td>{x.sizeBytes !== null ? formatBytes(x.sizeBytes) : "–"}</td>
                  <td>{formatDate(x.createdAt)}</td>
                  <td>
                    <StatusMark status={x.status} />
                  </td>
                  <td>{x.status === "complete" ? <DownloadButton experiment={experiment} file={x} /> : "–"}</td>
                  <td>{x.status === "complete" ? <CopyCodeButton experiment={experiment} file={x} /> : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
