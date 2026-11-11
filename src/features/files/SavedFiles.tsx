"use client";

import { useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { formatCount, formatDate } from "@/core/format";
import { Button, Panel, StatusMark, identClass } from "@/core/ui";
import { retrieveFileSnippet } from "@/features/snippets/snippets";
import { formatBytes, type SectionFile } from "./files";
import f from "./files.module.css";

// Download: ask the server for a 15-minute link, then the browser downloads straight from S3.
function DownloadButton({ experiment, section, file }: { experiment: string; section: string; file: SectionFile }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const r = await apiRequest<{ download_url: string }>(
        `/experiments/${experiment}/sections/${section}/files/${encodeURIComponent(file.file)}/${file.version}`,
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
function CopyCodeButton({ experiment, section, file }: { experiment: string; section: string; file: SectionFile }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(retrieveFileSnippet(experiment, section, file.file, file.version, true));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("Couldn't copy to the clipboard.");
    }
  }
  return <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy code"}</Button>;
}

// Delete: move this version to the trash (S3 removes it for good after 30 days).
function DeleteButton({ experiment, section, file, onDeleted }: { experiment: string; section: string; file: SectionFile; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    const ok = window.confirm(
      `Move ${file.savedAs} to the trash?\n\nIt is removed for good after 30 days. The next push of ${file.file} will reuse v${file.version}.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await apiRequest(`/experiments/${experiment}/sections/${section}/files/${encodeURIComponent(file.file)}/${file.version}`, {
        method: "DELETE",
      });
      onDeleted();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Couldn't delete the file.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="quiet" onClick={() => void remove()} disabled={busy}>
      {busy ? "Deleting…" : "Delete"}
    </Button>
  );
}

// Every file in one section's folder in S3 for this experiment, newest first.
export function SavedFiles({
  experiment,
  section,
  files,
  loading,
  error,
  onRefresh,
}: {
  experiment: string;
  section: string;
  files: SectionFile[];
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
        <p className={f.empty}>No files yet. Use the push step below to save one.</p>
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
                <th scope="col">Delete</th>
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
                  <td>{x.status === "complete" ? <DownloadButton experiment={experiment} section={section} file={x} /> : "–"}</td>
                  <td>{x.status === "complete" ? <CopyCodeButton experiment={experiment} section={section} file={x} /> : "–"}</td>
                  <td>
                    <DeleteButton experiment={experiment} section={section} file={x} onDeleted={onRefresh} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
