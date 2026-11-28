"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog, inputClass } from "@/core/ui";
import { formatBytes } from "@/features/files/files";
import { errorText, studyName, UPLOAD_ACCEPT, uploadStudyFile, type StudyFile, type StudySection } from "./study";
import st from "./study.module.css";

interface Row {
  name: string;
  state: "waiting" | "uploading" | "done" | "failed";
  message?: string;
}

interface Props {
  section: StudySection;
  open: boolean;
  /** Folders already used in this section (offered as you type). */
  folders: string[];
  onClose: () => void;
  /** Called for each file that is saved. */
  onUploaded: (file: StudyFile) => void;
}

// Pick files and a folder name, then each file goes straight from the browser to S3.
export function UploadDialog({ section, open, folders, onClose, onUploaded }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("");
  const [picked, setPicked] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  // A fresh start each time the dialog opens (the folder name is kept: you often upload several batches to one folder).
  useEffect(() => {
    if (open) {
      setPicked([]);
      setRows([]);
    }
  }, [open]);

  function pick(list: FileList | null) {
    setPicked(Array.from(list ?? []));
    setRows([]);
  }

  async function send() {
    const files = picked;
    setBusy(true);
    setPicked([]);
    setRows(files.map((f) => ({ name: f.name, state: "waiting" })));
    const mark = (i: number, row: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...row } : x)));
    for (const [i, f] of files.entries()) {
      mark(i, { state: "uploading" });
      try {
        const saved = await uploadStudyFile(section, folder, f);
        onUploaded(saved);
        mark(i, { state: "done", message: `saved as ${saved.uploadPath}` });
      } catch (e) {
        mark(i, { state: "failed", message: errorText(e, "Upload failed.") });
      }
    }
    if (input.current) input.current.value = "";
    setBusy(false);
  }

  const listId = `study-folders-${section}`;
  return (
    <Dialog open={open} onClose={onClose} title="Upload files">
      <div className={st.uploadForm}>
        <label className={st.field}>
          Folder (optional)
          <input
            className={inputClass}
            list={listId}
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="e.g. Week 3 or Week 3/Homework"
            disabled={busy}
          />
          <datalist id={listId}>
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <div className={st.field}>
          <span>Files</span>
          <div>
            <Button onClick={() => input.current?.click()} disabled={busy}>
              Choose files
            </Button>
          </div>
          <input ref={input} type="file" multiple hidden accept={UPLOAD_ACCEPT} onChange={(e) => pick(e.target.files)} />
          <p className={st.hint}>PDF, notebook (.ipynb), image (png, jpg, gif, webp), text (.txt, .md). Up to 100 MB each. Odd characters in a name become “_”.</p>
        </div>
        {picked.length > 0 && (
          <ul className={st.uploadList}>
            {picked.map((f, i) => (
              <li key={i}>
                <span>{studyName(f.name) || f.name}</span>
                <span>{formatBytes(f.size)}</span>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <ul className={st.uploadList} aria-live="polite">
            {rows.map((r, i) => (
              <li key={i} data-state={r.state}>
                <span>{r.name}</span>
                <span>{r.state === "waiting" ? "Waiting…" : r.state === "uploading" ? "Uploading…" : r.message}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={st.dialogActions}>
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            {rows.length > 0 && !busy ? "Done" : "Cancel"}
          </Button>
          {picked.length > 0 && (
            <Button variant="primary" onClick={() => void send()} disabled={busy}>
              {picked.length === 1 ? "Upload" : `Upload ${picked.length} files`}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
