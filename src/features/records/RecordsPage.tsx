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

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function RecordsPage() {
  const { records, revs, state, error, storeOk, tagNames, create, update, sync } = useRecords();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((x) => (!tag || x.experiments.includes(tag)) && (!q || `${x.title} ${docText(x.content)}`.toLowerCase().includes(q)));
  }, [records, query, tag]);
  const open = records.find((x) => x.id === openId) ?? list[0] ?? null;
  const allTags = useMemo(() => [...new Set([...tagNames, ...records.flatMap((x) => x.experiments)])].sort(), [tagNames, records]);

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
              setOpenId(create(tag ? [tag] : []));
              setConfirmDelete(false);
            }}
          >
            + New record
          </Button>
          <input className={r.search} type="search" placeholder="Search records" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search records" />
          <select className={r.search} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by experiment">
            <option value="">All experiments</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
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
                <span className={r.tagsLabel}>Experiments:</span>
                {allTags.map((t) => {
                  const onIt = open.experiments.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className={r.tag}
                      aria-pressed={onIt}
                      onClick={() => update(open.id, { experiments: onIt ? open.experiments.filter((e) => e !== t) : [...open.experiments, t] })}
                    >
                      {onIt ? "✓ " : "+ "}
                      {t}
                    </button>
                  );
                })}
                {!allTags.length && <span className={r.itemMeta}>Experiments appear here once the server has been on.</span>}
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
