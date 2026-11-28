"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/core/format";
import { Button, EmptyState, PageHeader } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { ServerGate } from "@/features/experiments/ServerGate";
import { FileTree } from "./FileTree";
import { Viewer } from "./Viewer";
import { errorText, syncStudy, useStudyTree, type SyncResult } from "./study";
import st from "./study.module.css";

const plural = (n: number, word: string) => `${n} ${word}`;
const summary = (r: SyncResult) =>
  r.firstSync ? `${plural(r.total, "files")} found` : `${plural(r.new, "new")}, ${plural(r.updated, "updated")}, ${plural(r.removed, "removed")}`;

// Course PDFs and notebooks from the GitHub repo: a folder tree on the left, the reader on the right.
// On tablets and phones the tree is a panel that slides over the reader (the Files button).
export function StudyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("file");
  const { tree, loading, error, refresh, markOpened } = useStudyTree();

  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<{ text: string; failed: boolean } | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [full, setFull] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (noteTimer.current && clearTimeout(noteTimer.current)), []);

  // Leaving the browser's own full screen (Esc, the phone's back gesture) also leaves ours.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Full screen: the reader area covers the page. Where the browser allows it (Android, desktop), it also hides the
  // address bar; iPhones and iPads don't allow that, so there the page's own covering is all you get.
  function toggleFull() {
    if (full) {
      setFull(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } else {
      setFull(true);
      void layoutRef.current?.requestFullscreen?.().catch(() => {});
    }
  }

  async function sync() {
    setSyncing(true);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    try {
      const r = await syncStudy();
      await refresh();
      setSyncNote({ text: summary(r), failed: false });
      noteTimer.current = setTimeout(() => setSyncNote(null), 10_000);
    } catch (e) {
      setSyncNote({ text: errorText(e, "The sync failed."), failed: true });
    } finally {
      setSyncing(false);
    }
  }

  const select = useCallback(
    (path: string) => {
      router.replace(`/study?file=${encodeURIComponent(path)}`, { scroll: false });
      setTreeOpen(false);
    },
    [router],
  );

  const file = tree?.files.find((f) => f.path === selected) ?? null;
  const neverSynced = tree !== null && tree.lastSyncedAt === null && tree.files.length === 0;

  const syncBox = (
    <div className={st.sync}>
      <span className={st.synced} data-failed={syncNote?.failed || undefined} role="status">
        {syncNote ? syncNote.text : tree?.lastSyncedAt ? `Synced ${formatDateTime(tree.lastSyncedAt)}` : "Not synced yet"}
      </span>
      <Button variant="primary" onClick={() => void sync()} disabled={syncing}>
        {syncing ? "Syncing…" : "Sync"}
      </Button>
    </div>
  );

  return (
    <div className={st.page}>
      <PageHeader title="MScFE" sub="Course PDFs and notebooks from your GitHub repo. Sync after you push new material." actions={syncBox} />
      <ServerGate>
        {loading ? (
          <GearSpinner label="Loading your course files…" />
        ) : error ? (
          <EmptyState title="The course files couldn't be loaded." action={<Button onClick={() => void refresh()}>Try again</Button>}>
            <p>{error}</p>
          </EmptyState>
        ) : neverSynced ? (
          <EmptyState title="Sync to load your course files" action={<Button variant="primary" onClick={() => void sync()} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</Button>}>
            <p>The server reads your GitHub repo once and lists its PDFs and notebooks here.</p>
          </EmptyState>
        ) : (
          <div ref={layoutRef} className={st.layout} data-full={full || undefined}>
            {treeOpen && <button type="button" className={st.scrim} aria-label="Close the file list" onClick={() => setTreeOpen(false)} />}
            <aside className={st.treePane} data-open={treeOpen || undefined} aria-label="Course files">
              <FileTree files={tree?.files ?? []} selected={selected} onSelect={select} />
            </aside>
            <Viewer file={file} onOpened={markOpened} onBrowse={() => setTreeOpen(true)} full={full} onToggleFull={toggleFull} />
          </div>
        )}
      </ServerGate>
    </div>
  );
}
