"use client";

// Research records: notes kept in this browser first, then synced to S3 (_records/<id>.json) through the
// server whenever it is on. Works with the server off: everything stays in localStorage until it can sync.
// Two copies of one record: the newer updated_at wins (one user, so this is enough).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { useLedger } from "@/data/LedgerProvider";

export interface ResearchRecord {
  id: string;
  title: string;
  content: Record<string, unknown>; // TipTap document
  experiments: string[]; // tags only; nothing is written into an experiment's folders
  created_at: string;
  updated_at: string;
  deleted: boolean;
  /** False while this browser has edits the server hasn't stored yet. Never sent to the server. */
  synced: boolean;
}

export type SyncState = "synced" | "pending" | "syncing" | "offline" | "error";

const STORE = "alpha-ledger:records:v1";
const TAGS = "alpha-ledger:records:experiments:v1";
const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function readStore(): ResearchRecord[] {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as ResearchRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStore(records: ResearchRecord[]): boolean {
  try {
    localStorage.setItem(STORE, JSON.stringify(records));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

function newId(): string {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
}

const now = () => new Date().toISOString();

/** The records, the sync state and the actions for the Research records page. */
export function useRecords() {
  const { server, experiments } = useLedger();
  const [records, setRecords] = useState<ResearchRecord[]>([]);
  const [state, setState] = useState<SyncState>("pending");
  const [error, setError] = useState<string | null>(null);
  const [storeOk, setStoreOk] = useState(true);
  /** Bumped when a sync replaces a record with the server's copy, so an open editor reloads it. */
  const [revs, setRevs] = useState<Record<string, number>>({});
  const ref = useRef<ResearchRecord[]>([]);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((next: ResearchRecord[]) => {
    ref.current = next;
    setRecords(next);
    setStoreOk(writeStore(next));
  }, []);

  useEffect(() => {
    commit(readStore());
  }, [commit]);

  // Experiment names for tags; remembered so tags can be picked while the server is off.
  const [tagNames, setTagNames] = useState<string[]>([]);
  useEffect(() => {
    try {
      if (experiments.length) {
        const names = experiments.map((e) => e.name);
        localStorage.setItem(TAGS, JSON.stringify(names));
        setTagNames(names);
      } else setTagNames(JSON.parse(localStorage.getItem(TAGS) ?? "[]") as string[]);
    } catch {
      setTagNames(experiments.map((e) => e.name));
    }
  }, [experiments]);

  const sync = useCallback(async () => {
    if (server !== "ready") {
      setState("offline");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setState("syncing");
    setError(null);
    try {
      const replaced: string[] = [];
      // 1. Push this browser's unsynced edits.
      for (const r of ref.current.filter((x) => !x.synced)) {
        const { synced: _s, id, ...body } = r;
        const res = await apiRequest<{ applied: boolean; record: ResearchRecord }>(`/records/${id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const latest = ref.current.find((x) => x.id === id);
        // Keep marking synced only if nothing changed locally while the request was out.
        if (latest && latest.updated_at === r.updated_at) {
          if (!res.applied) replaced.push(id);
          commit(ref.current.map((x) => (x.id === id ? { ...(res.applied ? x : (res.record as ResearchRecord)), synced: true } : x)));
        }
      }
      // 2. Pull: take the server's copy wherever it's newer and this browser has no pending edits.
      const remote = await apiRequest<ResearchRecord[]>("/records");
      const byId = new Map(ref.current.map((x) => [x.id, x]));
      for (const rr of remote) {
        const mine = byId.get(rr.id);
        if (!mine || (mine.synced && rr.updated_at > mine.updated_at)) {
          byId.set(rr.id, { ...rr, synced: true });
          if (mine) replaced.push(rr.id);
        }
      }
      commit([...byId.values()]);
      if (replaced.length) setRevs((v) => Object.fromEntries([...Object.entries(v), ...replaced.map((id) => [id, (v[id] ?? 0) + 1])]));
      setState(ref.current.some((r) => !r.synced) ? "pending" : "synced");
    } catch (e) {
      setState("error");
      setError(e instanceof ApiError ? e.message : "Couldn't sync with the server.");
    } finally {
      busy.current = false;
    }
  }, [server, commit]);

  // Sync when the server comes up, every minute while it's up, and when the browser comes back online.
  useEffect(() => {
    void sync();
    if (server !== "ready") return;
    const t = setInterval(() => void sync(), 60_000);
    const online = () => void sync();
    window.addEventListener("online", online);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", online);
    };
  }, [server, sync]);

  const scheduleSync = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void sync(), 1500);
  }, [sync]);

  /** Change a record (title, content, tags or deleted). Saved in this browser at once, synced shortly after. */
  const update = useCallback(
    (id: string, patch: Partial<Pick<ResearchRecord, "title" | "content" | "experiments" | "deleted">>) => {
      commit(ref.current.map((r) => (r.id === id ? { ...r, ...patch, updated_at: now(), synced: false } : r)));
      setState(server === "ready" ? "pending" : "offline");
      scheduleSync();
    },
    [commit, scheduleSync, server],
  );

  const create = useCallback(
    (experiments: string[] = []) => {
      const t = now();
      const r: ResearchRecord = { id: newId(), title: "", content: EMPTY_DOC, experiments, created_at: t, updated_at: t, deleted: false, synced: false };
      commit([r, ...ref.current]);
      setState(server === "ready" ? "pending" : "offline");
      scheduleSync();
      return r.id;
    },
    [commit, scheduleSync, server],
  );

  const visible = useMemo(() => records.filter((r) => !r.deleted).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [records]);

  return { records: visible, revs, state, error, storeOk, tagNames, server, create, update, sync };
}

/** Plain text of a TipTap document, for search and the list preview. */
export function docText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  return (n.text ?? "") + (n.content ?? []).map(docText).join(" ");
}
