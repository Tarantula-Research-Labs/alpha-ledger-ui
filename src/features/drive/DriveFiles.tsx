"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { formatDate } from "@/core/format";
import { Button, Dialog, Panel, StatusMark, identClass } from "@/core/ui";
import { formatBytes } from "@/features/files/files";
import { deleteDriveFile, downloadUrl, errorText, previewKind, uploadToDrive, useDriveFiles, type DriveFile } from "./drive";
import { Markdown } from "./Markdown";
import d from "./drive.module.css";

interface Upload {
  name: string;
  state: "uploading" | "done" | "failed";
  message?: string;
}

// Drop files here or pick them. Each one goes straight from the browser to S3.
function UploadBox({ onUploaded }: { onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);

  async function send(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setUploads(files.map((f) => ({ name: f.name, state: "uploading" })));
    for (const [i, f] of files.entries()) {
      try {
        const savedAs = await uploadToDrive(f);
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, state: "done", message: `saved as ${savedAs}` } : x)));
      } catch (e) {
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, state: "failed", message: errorText(e, "Upload failed.") } : x)));
      }
      onUploaded();
    }
    if (input.current) input.current.value = "";
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    void send(e.dataTransfer.files);
  }

  return (
    <Panel title="Upload">
      <div
        className={d.drop}
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <p>Drop files here, or</p>
        <Button onClick={() => input.current?.click()}>Choose files</Button>
        <input ref={input} type="file" multiple hidden onChange={(e) => void send(e.target.files)} />
        <p className={d.hint}>Any file type. Spaces and odd characters in the name become “_”. Same name again saves a new version (_v2, _v3…).</p>
      </div>
      {uploads.length > 0 && (
        <ul className={d.uploads}>
          {uploads.map((u, i) => (
            <li key={i} data-state={u.state}>
              <span className={identClass}>{u.name}</span>
              <span>{u.state === "uploading" ? "Uploading…" : u.state === "done" ? `Done, ${u.message}` : u.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// Image or rendered markdown, loaded from a 15-minute S3 link.
function Preview({ file, onClose }: { file: DriveFile | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    setText(null);
    setError(null);
    if (!file) return;
    let live = true;
    (async () => {
      try {
        const u = await downloadUrl(file);
        if (!live) return;
        setUrl(u);
        if (previewKind(file) === "markdown") {
          const r = await fetch(u);
          if (!r.ok) throw new Error(`S3 replied ${r.status}.`);
          const t = await r.text();
          if (live) setText(t);
        }
      } catch (e) {
        if (live) setError(errorText(e, "Couldn't load the preview. Check the bucket's CORS rule."));
      }
    })();
    return () => {
      live = false;
    };
  }, [file]);

  const kind = file ? previewKind(file) : null;
  return (
    <Dialog open={file !== null} onClose={onClose} title={file?.savedAs ?? ""} wide>
      {error ? (
        <p className={d.empty}>{error}</p>
      ) : kind === "image" && url ? (
        <img className={d.image} src={url} alt={file?.savedAs ?? ""} />
      ) : kind === "markdown" && text !== null ? (
        <Markdown text={text} />
      ) : (
        <p className={d.empty}>Loading…</p>
      )}
    </Dialog>
  );
}

async function download(f: DriveFile) {
  try {
    const a = document.createElement("a");
    a.href = await downloadUrl(f);
    a.download = f.savedAs;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    window.alert(errorText(e, "Couldn't get the download link."));
  }
}

function DeleteButton({ file, onDeleted }: { file: DriveFile; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm(`Move ${file.savedAs} to the trash?\n\nIt is removed for good after 30 days.`)) return;
    setBusy(true);
    try {
      await deleteDriveFile(file);
      onDeleted();
    } catch (e) {
      window.alert(errorText(e, "Couldn't delete the file."));
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

export function DriveFiles() {
  const { items: files, loading, error, refresh } = useDriveFiles();
  const [previewing, setPreviewing] = useState<DriveFile | null>(null);

  return (
    <div className={d.stack}>
      <UploadBox onUploaded={() => void refresh()} />
      <Panel
        title="Files"
        icon
        flush
        actions={
          <Button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        }
      >
        {error ? (
          <p className={d.empty}>{error}</p>
        ) : !loading && files.length === 0 ? (
          <p className={d.empty}>No files yet. Upload one above.</p>
        ) : (
          <div className={d.scroll}>
            <table className={d.table}>
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Version</th>
                  <th scope="col">Type</th>
                  <th scope="col">Size</th>
                  <th scope="col">Saved</th>
                  <th scope="col">Status</th>
                  <th scope="col">Preview</th>
                  <th scope="col">Download</th>
                  <th scope="col">Delete</th>
                </tr>
              </thead>
              <tbody>
                {files.map((x) => {
                  const ready = x.status === "complete";
                  return (
                    <tr key={`${x.file}-${x.version}`}>
                      <th scope="row">
                        <span className={identClass}>{x.savedAs}</span>
                      </th>
                      <td>v{x.version}</td>
                      <td>{x.contentType}</td>
                      <td>{x.sizeBytes !== null ? formatBytes(x.sizeBytes) : "–"}</td>
                      <td>{formatDate(x.createdAt)}</td>
                      <td>
                        <StatusMark status={x.status} />
                      </td>
                      <td>{ready && previewKind(x) ? <Button onClick={() => setPreviewing(x)}>Preview</Button> : "–"}</td>
                      <td>{ready ? <Button onClick={() => void download(x)}>Download</Button> : "–"}</td>
                      <td>
                        <DeleteButton file={x} onDeleted={() => void refresh()} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Preview file={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}
