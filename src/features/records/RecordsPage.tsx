"use client";

// Research records: free notes (findings, ideas, to-dos) that can be tagged with experiments.
// Works with the server off; edits stay in this browser and sync to S3 when the server is on.
import { useMemo, useState } from "react";
import { Button, PageHeader } from "@/core/ui";
import { RecordEditor } from "./RecordEditor";
import { docText, useRecords, type SyncState } from "./records";
import r from "./records.module.css";

const STATUS: Record<SyncState, string> = {
  synced: "Synced to S3",
  pending: "Saved in this browser · syncing soon",
  syncing: "Syncing…",
  offline: "Server off · saved in this browser, syncs when it's on",
  error: "Saved in this browser · sync failed",
};

/** A tag is "experiment" or "experiment:phase-folder". */
type Phase = { folder: string; label: string };
const splitTag = (t: string) => {
  const [exp, phase] = t.split(":");
  return { exp, phase: phase ?? "" };
};

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function RecordsPage({ phases }: { phases: Phase[] }) {
  const { records, revs, state, error, storeOk, tagNames, create, update, sync } = useRecords();
  const [openId, setOpenId] = useState<string | null>(null);
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

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tagged = (tags: string[]) =>
      (!fExp && !fPhase) || tags.map(splitTag).some((t) => (!fExp || t.exp === fExp) && (!fPhase || t.phase === fPhase));
    return records.filter((x) => tagged(x.experiments) && (!q || `${x.title} ${docText(x.content)}`.toLowerCase().includes(q)));
  }, [records, query, fExp, fPhase]);
  const open = records.find((x) => x.id === openId) ?? list[0] ?? null;
  const allExps = useMemo(() => [...new Set([...tagNames, ...records.flatMap((x) => x.experiments.map((t) => splitTag(t).exp))])].sort(), [tagNames, records]);

  return (
    <>
      <PageHeader
        title="Research records"
        sub="Findings, ideas and to-dos. Tag a record with any experiments; tags never change an experiment's files."
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
          <Button
            variant="primary"
            onClick={() => {
              setOpenId(create(fExp ? [fPhase ? `${fExp}:${fPhase}` : fExp] : []));
              setConfirmDelete(false);
            }}
          >
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
          <ul className={r.list}>
            {list.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  className={r.item}
                  aria-current={open?.id === x.id ? "true" : undefined}
                  onClick={() => {
                    setOpenId(x.id);
                    setConfirmDelete(false);
                  }}
                >
                  <b>{x.title || "Untitled"}</b>
                  <span className={r.preview}>{docText(x.content).slice(0, 80) || "Empty"}</span>
                  <span className={r.itemMeta}>
                    {when(x.updated_at)}
                    {!x.synced && <em title="Not synced to S3 yet"> · not synced</em>}
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className={r.empty}>{records.length ? "No records match." : "No records yet."}</li>}
          </ul>
        </aside>
        <section className={r.main}>
          {open ? (
            <>
              <input className={r.title} value={open.title} placeholder="Untitled" onChange={(e) => update(open.id, { title: e.target.value })} aria-label="Title" />
              <div className={r.tags}>
                <span className={r.tagsLabel}>Tags:</span>
                {open.experiments.map((t) => (
                  <span key={t} className={r.tag} aria-pressed="true">
                    {tagLabel(t)}
                    <button type="button" className={r.tagX} aria-label={`Remove tag ${tagLabel(t)}`} onClick={() => update(open.id, { experiments: open.experiments.filter((e) => e !== t) })}>
                      ×
                    </button>
                  </span>
                ))}
                {adding ? (
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
                )}
              </div>
              <RecordEditor key={`${open.id}:${revs[open.id] ?? 0}`} content={open.content} onChange={(doc) => update(open.id, { content: doc })} />
              <div className={r.footer}>
                <span className={r.itemMeta}>
                  Created {when(open.created_at)} · edited {when(open.updated_at)}
                </span>
                {confirmDelete ? (
                  <span className={r.confirm}>
                    Delete this record?
                    <Button
                      onClick={() => {
                        update(open.id, { deleted: true });
                        setOpenId(null);
                        setConfirmDelete(false);
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
          ) : (
            <div className={r.empty}>Create a record to start writing. It works with the server off.</div>
          )}
        </section>
      </div>
    </>
  );
}
