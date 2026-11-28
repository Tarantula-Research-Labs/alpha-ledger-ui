"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button, EmptyState } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { errorText, fileName, folderOf, openStudyFile, openUpload, type Passage, type StudyFile, type StudyKind, type StudySection } from "./study";
import st from "./study.module.css";

// pdf.js is big: it is only fetched when the first PDF opens.
const PdfReader = dynamic(() => import("./PdfReader").then((m) => m.PdfReader), {
  ssr: false,
  loading: () => (
    <div className={st.centre}>
      <GearSpinner label="Preparing the PDF…" />
    </div>
  ),
});

// A text file bigger than this isn't drawn in the page (it would be slow); it opens in a new tab instead.
const MAX_TEXT_BYTES = 2_000_000;

type State = { phase: "idle" } | { phase: "loading" } | { phase: "ready"; url: string; kind: StudyKind } | { phase: "error"; message: string };

interface Props {
  section: StudySection;
  file: StudyFile | null;
  /** Called once the server has the file ready (it is then marked seen). */
  onOpened: (path: string) => void;
  /** Show the file list (the "Browse files" button of an empty reader). */
  onBrowse: () => void;
  /** The Files button: folds the file list away or brings it back (a slide-over on narrow screens). */
  onToggleFiles: () => void;
  /** Full screen: the reader and the file list fill the whole screen. */
  full: boolean;
  onToggleFull: () => void;
  /** An uploaded file can be removed from the section. */
  onRemove: () => void;
  /** The Ask panel: its button, and whether it is open. */
  onAsk: () => void;
  askOpen: boolean;
  /** Told how many pages the open PDF has (null when no PDF is open). */
  onPages: (pages: number | null) => void;
  /** Told which page of the open PDF is showing (null when no PDF is open). */
  onPage: (page: number | null) => void;
  /** A passage selected in the PDF, to ask about. */
  onPassage: (passage: Passage) => void;
}

// A text or Markdown file, shown as plain text.
function TextView({ url }: { url: string }) {
  const [body, setBody] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => live && setBody(t))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [url]);
  if (failed) return <div className={st.centre}><p>The file couldn&apos;t be loaded. Try Reload.</p></div>;
  if (body === null) return <div className={st.centre}><GearSpinner label="Loading…" /></div>;
  return <pre className={st.text}>{body}</pre>;
}

// The open file. The server copies it from GitHub into S3 the first time and gives a 15-minute link.
// A PDF is drawn by pdf.js inside the app (phones can't show a PDF inside a page).
// An image is shown as it is, a text file as plain text.
// A notebook is a page of its own, so its frame is sandboxed: scripts and the print window are allowed, nothing else.
export function Viewer({ section, file, onOpened, onBrowse, onToggleFiles, full, onToggleFull, onRemove, onAsk, askOpen, onPages, onPage, onPassage }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [tick, setTick] = useState(0); // Reload: ask the server again for a fresh link
  const path = file?.path ?? null;
  const uploadPath = file?.uploadPath ?? null;

  useEffect(() => {
    if (!path) {
      setState({ phase: "idle" });
      return;
    }
    let live = true;
    setState({ phase: "loading" });
    (uploadPath !== null ? openUpload(section, uploadPath) : openStudyFile(path))
      .then((o) => {
        if (!live) return;
        setState({ phase: "ready", url: o.url, kind: o.kind });
        onOpened(path);
      })
      .catch((e) => {
        if (live) setState({ phase: "error", message: errorText(e, "Couldn't open this file.") });
      });
    return () => {
      live = false;
    };
  }, [section, path, uploadPath, tick, onOpened]);

  // The Ask panel needs the page count and the open page of a PDF; anything else has none.
  const isPdf = state.phase === "ready" && state.kind === "pdf";
  useEffect(() => {
    if (!isPdf) {
      onPages(null);
      onPage(null);
    }
  }, [isPdf, state, onPages, onPage]);

  return (
    <section className={st.viewer} aria-label="Reader">
      <div className={st.viewerBar}>
        <Button variant="quiet" className={st.filesToggle} onClick={onToggleFiles} title="Show or hide the file list">
          Files
        </Button>
        <div className={st.title} title={path ?? undefined}>
          {file ? (
            <>
              {folderOf(file.path) && <span className={st.crumb}>{folderOf(file.path)} / </span>}
              <strong>{fileName(file.path)}</strong>
            </>
          ) : (
            <span className={st.crumb}>No file open</span>
          )}
        </div>
        {file?.badge === "updated" && <span className={st.note}>Updated on GitHub</span>}
        {state.phase === "ready" && (
          <Button variant="quiet" onClick={() => window.open(state.url, "_blank", "noopener,noreferrer")}>
            <span className={st.long}>Open in new tab</span>
            <span className={st.short}>New tab</span>
          </Button>
        )}
        {file && (
          <Button variant="quiet" className={st.reloadBtn} onClick={() => setTick((t) => t + 1)} disabled={state.phase === "loading"}>
            Reload
          </Button>
        )}
        {file?.uploaded && (
          <Button variant="quiet" onClick={onRemove}>
            Remove
          </Button>
        )}
        <Button variant={askOpen ? "primary" : "default"} onClick={onAsk} aria-pressed={askOpen}>
          Ask
        </Button>
        <Button variant="quiet" onClick={onToggleFull} aria-pressed={full}>
          {full ? "Exit full screen" : "Full screen"}
        </Button>
      </div>
      <div className={st.frameWrap}>
        {state.phase === "idle" && (
          <div className={st.centre}>
            <EmptyState title="Pick a file to read" action={<Button className={st.filesBtn} onClick={onBrowse}>Browse files</Button>}>
              <p>Choose a file from the list.</p>
            </EmptyState>
          </div>
        )}
        {state.phase === "loading" && (
          <div className={st.centre}>
            <GearSpinner label="Opening… the first time a file is opened, it is copied from GitHub." />
          </div>
        )}
        {state.phase === "error" && (
          <div className={st.centre}>
            <EmptyState title="This file couldn't be opened." action={<Button onClick={() => setTick((t) => t + 1)}>Try again</Button>}>
              <p>{state.message}</p>
            </EmptyState>
          </div>
        )}
        {state.phase === "ready" &&
          (state.kind === "pdf" ? (
            <PdfReader key={state.url} url={state.url} onPages={onPages} onPage={onPage} onPassage={onPassage} />
          ) : state.kind === "image" ? (
            <div className={st.imageWrap}>
              <img className={st.image} src={state.url} alt={file ? fileName(file.path) : ""} />
            </div>
          ) : state.kind === "text" ? (
            file && file.sizeBytes > MAX_TEXT_BYTES ? (
              <div className={st.centre}>
                <p>This file is too big to show here. Use New tab to read it.</p>
              </div>
            ) : (
              <TextView key={state.url} url={state.url} />
            )
          ) : (
            <iframe
              key={state.url}
              className={st.frame}
              src={state.url}
              title={file ? fileName(file.path) : "Notebook"}
              sandbox="allow-scripts allow-modals allow-popups allow-popups-to-escape-sandbox"
            />
          ))}
      </div>
    </section>
  );
}
