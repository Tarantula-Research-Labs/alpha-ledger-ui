"use client";

// Research records: free notes (findings, ideas, to-dos) tagged with experiments and their phases.
// Notes show as a grid grouped by phase; click one to read it formatted, then Edit to change it.
// Works with the server off; edits stay in this browser and sync to S3 when the server is on.
import { useMemo, useState } from "react";
import { Button, PageHeader } from "@/core/ui";
import { RecordEditor } from "./RecordEditor";
import { RecordView } from "./RecordView";
import { docText, useRecords, type ResearchRecord, type SyncState } from "./records";
import r from "./records.module.css";

const STATUS: Record<SyncState, string> = {
  synced: "Synced to S3",
  pending: "Saved in this browser · syncing soon",
  syncing: "Syncing…",
  offline: "Server offline · saved in this browser, syncs when it's back",
  error: "Saved in this browser · sync failed",
};

/** A tag is "experiment" or "experiment:phase-folder". */
type Phase = { folder: string; label: string };
const splitTag = (t: string) => {
  const [exp, phase] = t.split(":");
  return { exp, phase: phase ?? "" };
};
const WHOLE = "__whole";
const UNTAGGED = "__untagged";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function RecordsPage({ phases }: { phases: Phase[] }) {
  const { records, revs, state, error, storeOk, tagNames, create, update, sync } = useRecords();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [fExp, setFExp] = useState("");
  const [fPhase, setFPhase] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newExp, setNewExp] = useState("");
  const [newPhase, setNewPhase] = useState("");

  const phaseLabel = (folder: string) => phases.find((p) => p.folder === folder)?.label ?? folder;
  const tagLabel = (t: string) => {
    const { exp, phase } = splitTag(t);
    return phase ? `${exp} · ${phaseLabel(phase)}` : exp;
  };
  const allExps = useMemo(() => [...new Set([...tagNames, ...records.flatMap((x) => x.experiments.map((t) => splitTag(t).exp))])].sort(), [tagNames, records]);

  // Grid: one group per phase; a note tagged with several phases shows in each. Filters narrow it down.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, ResearchRecord[]>();
    const add = (key: string, rec: ResearchRecord) => map.set(key, [...(map.get(key) ?? []), rec]);
    for (const rec of records) {
      if (q && !`${rec.title} ${docText(rec.content)}`.toLowerCase().includes(q)) continue;
      const tags = rec.experiments.map(splitTag).filter((t) => (!fExp || t.exp === fExp) && (!fPhase || t.phase === fPhase));
      if (!rec.experiments.length) {
        if (!fExp && !fPhase) add(UNTAGGED, rec);
        continue;
      }
      const keys = new Set(tags.map((t) => t.phase || WHOLE));
      keys.forEach((k) => add(k, rec));
    }
    const order = [...phases.map((p) => p.folder), WHOLE, UNTAGGED, ...[...map.keys()].filter((k) => k !== WHOLE && k !== UNTAGGED && !phases.some((p) => p.folder === k))];
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, label: k === WHOLE ? "Whole experiment" : k === UNTAGGED ? "Untagged" : phaseLabel(k), items: map.get(k)! }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, query, fExp, fPhase, phases]);

  const open = openId ? records.find((x) => x.id === openId) ?? null : null;
  const show = (id: string | null, edit = false) => {
    setOpenId(id);
    setEditing(edit);
    setConfirmDelete(false);
    setAdding(false);
  };

  const tagChips = (rec: ResearchRecord, removable: boolean) =>
    rec.experiments.map((t) => (
      <span key={t} className={r.tag} aria-pressed="true">
        {tagLabel(t)}
        {removable && (
          <button type="button" className={r.tagX} aria-label={`Remove tag ${tagLabel(t)}`} onClick={() => update(rec.id, { experiments: rec.experiments.filter((e) => e !== t) })}>
            ×
          </button>
        )}
      </span>
    ));

  return (
    <>
      <PageHeader
        title="Research records"
        sub="Findings, ideas and to-dos, grouped by phase. Tags never change an experiment's files."
        actions={
          <span className={r.status} data-state={state} title={error ?? undefined}>
            <i />
            {STATUS[state]}
            {state === "error" && (
              <button type="button" className={r.linkBtn} onClick={() => void sync()}>
                Retry
              </button>
            )}
          </span>
        }
      />
      {!storeOk && <p className={r.warn}>This browser couldn&apos;t save locally (storage full or blocked). Edits are kept only while this page is open.</p>}
      <div className={r.layout}>
        <aside className={r.side}>
          <Button variant="primary" onClick={() => show(create(fExp ? [fPhase ? `${fExp}:${fPhase}` : fExp] : []), true)}>
            + New record
          </Button>
          <input className={r.search} type="search" placeholder="Search records" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search records" />
          <select className={r.search} value={fExp} onChange={(e) => setFExp(e.target.value)} aria-label="Filter by experiment">
            <option value="">All experiments</option>
            {allExps.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className={r.search} value={fPhase} onChange={(e) => setFPhase(e.target.value)} aria-label="Filter by phase">
            <option value="">All phases</option>
            {phases.map((p) => (
              <option key={p.folder} value={p.folder}>
                {p.label}
              </option>
            ))}
          </select>
          {open && (
            <button type="button" className={r.backBtn} onClick={() => show(null)}>
              ‹ All records
            </button>
          )}
        </aside>

        <section className={r.main}>
          {!open ? (
            /* ---------- Grid ---------- */
            groups.length ? (
              groups.map((g) => (
                <div key={g.key} className={r.group}>
                  <h2 className={r.groupTitle}>
                    {g.label} <span>{g.items.length}</span>
                  </h2>
                  <div className={r.grid}>
                    {g.items.map((rec) => (
                      <button key={`${g.key}-${rec.id}`} type="button" className={r.card} onClick={() => show(rec.id)}>
                        <b className={r.cardTitle}>{rec.title || "Untitled"}</b>
                        <span className={r.cardTags}>{rec.experiments.map((t) => splitTag(t).exp).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "No tags"}</span>
                        <RecordView content={rec.content} className={r.cardBody} />
                        <span className={r.itemMeta}>
                          {when(rec.updated_at)}
                          {!rec.synced && <em> · not synced</em>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className={r.empty}>{records.length ? "No records match." : "No records yet. Create one to start writing; it works with the server off."}</div>
            )
          ) : (
            /* ---------- Read or edit one record ---------- */
            <>
              <div className={r.headRow}>
                {editing ? (
                  <input className={r.title} value={open.title} placeholder="Untitled" onChange={(e) => update(open.id, { title: e.target.value })} aria-label="Title" />
                ) : (
                  <h2 className={r.title}>{open.title || "Untitled"}</h2>
                )}
                <Button variant={editing ? "primary" : "default"} onClick={() => setEditing(!editing)}>
                  {editing ? "Done" : "Edit"}
                </Button>
              </div>
              <div className={r.tags}>
                <span className={r.tagsLabel}>Tags:</span>
                {tagChips(open, editing)}
                {!open.experiments.length && !editing && <span className={r.itemMeta}>None</span>}
                {editing &&
                  (adding ? (
                    <span className={r.addTag}>
                      <select className={r.search} value={newExp} onChange={(e) => setNewExp(e.target.value)} aria-label="Experiment">
                        <option value="">Experiment…</option>
                        {allExps.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <select className={r.search} value={newPhase} onChange={(e) => setNewPhase(e.target.value)} aria-label="Phase">
                        <option value="">Whole experiment</option>
                        {phases.map((p) => (
                          <option key={p.folder} value={p.folder}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        disabled={!newExp}
                        onClick={() => {
                          const t = newPhase ? `${newExp}:${newPhase}` : newExp;
                          if (!open.experiments.includes(t)) update(open.id, { experiments: [...open.experiments, t] });
                          setAdding(false);
                          setNewPhase("");
                        }}
                      >
                        Add
                      </Button>
                      <Button variant="quiet" onClick={() => setAdding(false)}>
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <button type="button" className={r.tag} onClick={() => setAdding(true)} disabled={!allExps.length} title={allExps.length ? undefined : "Experiments appear here once the server has been on."}>
                      + Add tag
                    </button>
                  ))}
              </div>
              {editing ? (
                <RecordEditor key={`${open.id}:${revs[open.id] ?? 0}`} content={open.content} onChange={(doc) => update(open.id, { content: doc })} />
              ) : (
                <RecordView content={open.content} />
              )}
              <div className={r.footer}>
                <span className={r.itemMeta}>
                  Created {when(open.created_at)} · edited {when(open.updated_at)}
                  {!open.synced && <em> · not synced</em>}
                </span>
                {confirmDelete ? (
                  <span className={r.confirm}>
                    Delete this record?
                    <Button
                      onClick={() => {
                        update(open.id, { deleted: true });
                        show(null);
                      }}
                    >
                      Delete
                    </Button>
                    <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button variant="quiet" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
