"use client";

import { useState, type FormEvent } from "react";
import { formatDate } from "@/core/format";
import { Button, Dialog, Field, Panel, inputClass } from "@/core/ui";
import { latestMark, useMarks } from "@/data/marks";
import m from "./marks.module.css";

// The drafts of one section. "Mark complete" saves the next draft (Draft 1, Draft 2, ...) with an optional note.
export function SectionMarks({ experiment, section }: { experiment: string; section: string }) {
  const { marks, error, addMark, hideMark } = useMarks();
  const mine = marks.filter((x) => x.section === section).sort((a, b) => a.draft - b.draft);
  const next = (latestMark(marks, section)?.draft ?? 0) + 1;

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setNote("");
    setProblem(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const p = await addMark(section, note);
    setBusy(false);
    if (p) {
      setProblem(p);
      return;
    }
    close();
  }

  async function remove(id: number, draft: number) {
    if (!window.confirm(`Delete Draft ${draft}? It will no longer show in the app.`)) return;
    const p = await hideMark(section, id);
    if (p) window.alert(p);
  }

  return (
    <div className={m.wrap}>
      <Panel title="Drafts" icon actions={<Button variant="primary" onClick={() => setOpen(true)}>Mark complete</Button>}>
        {error ? (
          <p className={m.empty}>{error}</p>
        ) : mine.length === 0 ? (
          <p className={m.empty}>In progress. No draft marked complete yet.</p>
        ) : (
          <ul className={m.list}>
            {mine.map((x) => (
              <li key={x.id} className={m.item}>
                <strong>Draft {x.draft}</strong>
                <span className={m.date}>{formatDate(x.createdAt)}</span>
                <span className={m.note}>{x.note}</span>
                <Button variant="quiet" onClick={() => remove(x.id, x.draft)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={open} onClose={close} title={`Mark Draft ${next} complete`}>
        <form onSubmit={submit}>
          <Field label="Note" id="mark-note" hint="What was done in this draft. Optional." error={problem}>
            <textarea id="mark-note" className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className={m.actions}>
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : `Save Draft ${next}`}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
