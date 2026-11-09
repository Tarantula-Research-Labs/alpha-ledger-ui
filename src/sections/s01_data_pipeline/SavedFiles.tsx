"use client";

import { formatCount, formatDate } from "@/core/format";
import { Button, Panel, StatusMark, identClass } from "@/core/ui";
import { formatBytes, type PipelineFile } from "./files";
import f from "./files.module.css";

// Every file in this experiment's Data Pipeline folder in S3, newest first.
export function SavedFiles({
  files,
  loading,
  error,
  onRefresh,
}: {
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
