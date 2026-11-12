"use client";

import { useState, type FormEvent } from "react";
import { formatDate } from "@/core/format";
import { Button, CodeBlock, Dialog, Field, Panel, inputClass } from "@/core/ui";
import { createNote, errorText, hideNote, useDriveNotes, type DriveNote } from "./drive";
import { Markdown } from "./Markdown";
import d from "./drive.module.css";

function NewNoteDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"code" | "markdown">("code");
  const [language, setLanguage] = useState("python");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setTitle("");
    setKind("code");
    setLanguage("python");
    setBody("");
    setError(null);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createNote({ title: title.trim(), kind, language: kind === "code" ? language.trim() : "", body });
      onSaved();
      close();
    } catch (err) {
      setError(errorText(err, "Couldn't save the note."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} title="New note" wide>
      <form onSubmit={submit}>
        <Field label="Title" id="note-title" error={error}>
          <input id="note-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </Field>
        <div className={d.pair}>
          <Field label="Kind" id="note-kind">
            <select id="note-kind" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as "code" | "markdown")}>
              <option value="code">Code</option>
              <option value="markdown">Markdown</option>
            </select>
          </Field>
          {kind === "code" && (
            <Field label="Language" id="note-lang">
              <input id="note-lang" className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)} spellCheck={false} />
            </Field>
          )}
        </div>
        <Field label={kind === "code" ? "Code" : "Text"} id="note-body">
          <textarea
            id="note-body"
            className={`${inputClass} ${d.body}`}
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={kind === "markdown"}
            maxLength={100000}
          />
        </Field>
        <div className={d.actions}>
          <Button variant="quiet" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : "Save note"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function NoteCard({ note, onHidden }: { note: DriveNote; onHidden: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm(`Delete “${note.title}”?`)) return;
    setBusy(true);
    try {
      await hideNote(note.id);
      onHidden();
    } catch (e) {
      window.alert(errorText(e, "Couldn't delete the note."));
      setBusy(false);
    }
  }
  return (
    <Panel
      title={note.title}
      actions={
        <>
          <span className={d.meta}>{formatDate(note.createdAt)}</span>
          <Button variant="quiet" onClick={() => void remove()} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      {note.kind === "code" ? <CodeBlock code={note.body} label={note.language || "Code"} /> : <Markdown text={note.body} />}
    </Panel>
  );
}

export function DriveNotes() {
  const { items: notes, loading, error, refresh } = useDriveNotes();
  const [creating, setCreating] = useState(false);

  return (
    <div className={d.stack}>
      <div className={d.toolbar}>
        <Button variant="primary" onClick={() => setCreating(true)}>
          New note
        </Button>
        <Button onClick={() => void refresh()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      {error ? (
        <p className={d.empty}>{error}</p>
      ) : !loading && notes.length === 0 ? (
        <p className={d.empty}>No notes yet. Use New note to save a note or a code snippet.</p>
      ) : (
        notes.map((n) => <NoteCard key={n.id} note={n} onHidden={() => void refresh()} />)
      )}
      <NewNoteDialog open={creating} onClose={() => setCreating(false)} onSaved={() => void refresh()} />
    </div>
  );
}
