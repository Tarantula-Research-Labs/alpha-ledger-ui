"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTime } from "@/core/format";
import { Button, Dialog, EmptyState, PageHeader } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { ServerGate } from "@/features/experiments/ServerGate";
import { AskPanel } from "./AskPanel";
import { FileTree } from "./FileTree";
import { useSavedFlag } from "./savedFlag";
import { UploadDialog } from "./UploadDialog";
import { Viewer } from "./Viewer";
import { errorText, folderOf, removeUpload, STUDY_SECTIONS, syncStudy, useStudyFiles, type Passage, type StudyFile, type StudySection, type SyncResult } from "./study";
import st from "./study.module.css";

const plural = (n: number, word: string) => `${n} ${word}`;
const summary = (r: SyncResult) =>
  r.firstSync ? `${plural(r.total, "files")} found` : `${plural(r.new, "new")}, ${plural(r.updated, "updated")}, ${plural(r.removed, "removed")}`;

// One Study section: a folder tree on the left, the reader on the right. MScFE also lists the course PDFs and
// notebooks from the GitHub repo (with Sync); every section takes uploads.
// On tablets and phones the tree is a panel that slides over the reader (the Files button).
// The Ask button opens Gemini's panel: a third column on wide screens, over the reader on smaller ones.
export function StudyPage({ section: sectionId }: { section: StudySection }) {
  const section = STUDY_SECTIONS.find((x) => x.id === sectionId) ?? STUDY_SECTIONS[0];
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("file");
  const { tree, loading, error, refresh, markOpened, addUploaded, dropUploaded } = useStudyFiles(section.id);

  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<{ text: string; failed: boolean } | null>(null);
  const [treeOpen, setTreeOpen] = useState(false); // narrow screens: the file list slid over the reader
  const [treeFolded, setTreeFolded] = useSavedFlag("study.treeFolded"); // desktop: the file list folded away
  const [full, setFull] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [pages, setPages] = useState<number | null>(null); // pages of the open PDF, for the Ask panel
  const [page, setPage] = useState<number | null>(null); // the page showing in the open PDF
  const [passage, setPassage] = useState<Passage | null>(null); // text selected in the PDF, waiting to be asked about
  const [removing, setRemoving] = useState<StudyFile | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const lastUploaded = useRef<string | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (noteTimer.current && clearTimeout(noteTimer.current)), []);

  // A selected passage belongs to the file it was taken from.
  useEffect(() => setPassage(null), [selected]);

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

  // Below 1100px the file list is a slide-over; above it is a column that can be folded away.
  const narrow = () => window.matchMedia("(max-width: 1100px)").matches;
  function showFiles() {
    if (narrow()) {
      setAskOpen(false);
      setTreeOpen(true);
    } else setTreeFolded(false);
  }
  function toggleFiles() {
    if (narrow()) {
      setAskOpen(false);
      setTreeOpen((o) => !o);
    } else setTreeFolded(!treeFolded);
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
      router.replace(`${section.href}?file=${encodeURIComponent(path)}`, { scroll: false });
      setTreeOpen(false);
    },
    [router, section.href],
  );

  // Closing the upload dialog opens the file that was uploaded last.
  function closeUpload() {
    setUploadOpen(false);
    const last = lastUploaded.current;
    lastUploaded.current = null;
    if (last) select(last);
  }

  async function confirmRemove() {
    if (!removing?.uploadPath) return;
    setRemoveBusy(true);
    try {
      await removeUpload(section.id, removing.uploadPath);
      dropUploaded(removing.path);
      if (selected === removing.path) router.replace(section.href, { scroll: false });
      setRemoving(null);
    } catch (e) {
      setRemoveError(errorText(e, "Couldn't remove the file."));
    } finally {
      setRemoveBusy(false);
    }
  }

  const file = tree?.files.find((f) => f.path === selected) ?? null;
  const empty = tree !== null && tree.files.length === 0;
  const neverSynced = section.hasRepo && empty && tree.lastSyncedAt === null;
  // The folders already used by uploads, offered when you type a folder name.
  const uploadFolders = [...new Set((tree?.files ?? []).filter((f) => f.uploadPath !== null).map((f) => folderOf(f.uploadPath ?? "")).filter(Boolean))].sort();

  const uploadButton = <Button onClick={() => setUploadOpen(true)}>Upload</Button>;
  const actions = section.hasRepo ? (
    <div className={st.sync}>
      <span className={st.synced} data-failed={syncNote?.failed || undefined} role="status">
        {syncNote ? syncNote.text : tree?.lastSyncedAt ? `Synced ${formatDateTime(tree.lastSyncedAt)}` : "Not synced yet"}
      </span>
      <Button variant="primary" onClick={() => void sync()} disabled={syncing}>
        {syncing ? "Syncing…" : "Sync"}
      </Button>
      {uploadButton}
    </div>
  ) : (
    <div className={st.sync}>
      <span className={st.synced}>{tree ? `${tree.files.length} ${tree.files.length === 1 ? "file" : "files"}` : ""}</span>
      {uploadButton}
    </div>
  );

  return (
    <div className={st.page}>
      <PageHeader
        title={section.label}
        sub={section.hasRepo ? "Course PDFs and notebooks from your GitHub repo, and files you upload. Sync after you push new material." : "Files you upload: PDFs, notebooks, images and text."}
        actions={actions}
      />
      <ServerGate>
        {loading ? (
          <GearSpinner label="Loading your course files…" />
        ) : error ? (
          <EmptyState title="The course files couldn't be loaded." action={<Button onClick={() => void refresh()}>Try again</Button>}>
            <p>{error}</p>
          </EmptyState>
        ) : neverSynced ? (
          <EmptyState title="Sync to load your course files" action={<Button variant="primary" onClick={() => void sync()} disabled={syncing}>{syncing ? "Syncing…" : "Sync now"}</Button>}>
            <p>The server reads your GitHub repo once and lists its PDFs and notebooks here. You can also upload your own files.</p>
          </EmptyState>
        ) : empty ? (
          <EmptyState title="No files yet" action={<Button variant="primary" onClick={() => setUploadOpen(true)}>Upload a file</Button>}>
            <p>Upload PDFs, notebooks, images or text files and read them here.</p>
          </EmptyState>
        ) : (
          <div ref={layoutRef} className={st.layout} data-full={full || undefined} data-ask={askOpen || undefined} data-tree-folded={treeFolded || undefined}>
            {(treeOpen || askOpen) && (
              <button
                type="button"
                className={st.scrim}
                aria-label="Close the panel"
                onClick={() => {
                  setTreeOpen(false);
                  setAskOpen(false);
                }}
              />
            )}
            <button type="button" className={st.treeRail} onClick={() => setTreeFolded(false)} aria-label="Show the file list" title="Show the file list">
              ›
            </button>
            <aside className={st.treePane} data-open={treeOpen || undefined} aria-label="Course files">
              <FileTree files={tree?.files ?? []} selected={selected} onSelect={select} onFold={() => setTreeFolded(true)} />
            </aside>
            <Viewer
              section={section.id}
              file={file}
              onOpened={markOpened}
              onBrowse={showFiles}
              onToggleFiles={toggleFiles}
              full={full}
              onToggleFull={toggleFull}
              onRemove={() => {
                setRemoveError(null);
                setRemoving(file);
              }}
              onAsk={() => {
                setTreeOpen(false);
                setAskOpen((o) => !o);
              }}
              askOpen={askOpen}
              onPages={setPages}
              onPage={setPage}
              onPassage={(p) => {
                setPassage(p);
                setTreeOpen(false);
                setAskOpen(true);
              }}
            />
            {askOpen && <AskPanel section={section.id} file={file} pages={pages} page={page} passage={passage} onPassageDone={() => setPassage(null)} onClose={() => setAskOpen(false)} />}
          </div>
        )}
      </ServerGate>
      <UploadDialog
        section={section.id}
        open={uploadOpen}
        folders={uploadFolders}
        onClose={closeUpload}
        onUploaded={(f) => {
          addUploaded(f);
          lastUploaded.current = f.path;
        }}
      />
      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title="Remove this file?">
        <div className={st.uploadForm}>
          <p>
            <strong>{removing?.uploadPath}</strong> will disappear from this section. Its copy stays in storage, so nothing is lost for good.
          </p>
          {removeError && <p className={st.hint} data-failed>{removeError}</p>}
          <div className={st.dialogActions}>
            <Button variant="quiet" onClick={() => setRemoving(null)} disabled={removeBusy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void confirmRemove()} disabled={removeBusy}>
              {removeBusy ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
