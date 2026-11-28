"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { errorText, fileName, folderOf, openStudyFile, type StudyFile, type StudyKind } from "./study";
import st from "./study.module.css";

type State = { phase: "idle" } | { phase: "loading" } | { phase: "ready"; url: string; kind: StudyKind } | { phase: "error"; message: string };

interface Props {
  file: StudyFile | null;
  /** Called once the server has the file ready (it is then marked seen). */
  onOpened: (path: string) => void;
  /** Narrow screens: show the file list. */
  onBrowse: () => void;
}

// The open file. The server copies it from GitHub into S3 the first time and gives a 15-minute link.
// A PDF goes in the browser's own PDF viewer (it can't run inside a sandboxed frame).
// A notebook is a page of its own, so its frame is sandboxed: scripts and the print window are allowed, nothing else.
export function Viewer({ file, onOpened, onBrowse }: Props) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [tick, setTick] = useState(0); // Reload: ask the server again for a fresh link
  const path = file?.path ?? null;

  useEffect(() => {
    if (!path) {
      setState({ phase: "idle" });
      return;
    }
    let live = true;
    setState({ phase: "loading" });
    openStudyFile(path)
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
  }, [path, tick, onOpened]);

  return (
    <section className={st.viewer} aria-label="Reader">
      <div className={st.viewerBar}>
        <Button variant="quiet" className={st.filesBtn} onClick={onBrowse}>
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
            Open in new tab
          </Button>
        )}
        {file && (
          <Button variant="quiet" onClick={() => setTick((t) => t + 1)} disabled={state.phase === "loading"}>
            Reload
          </Button>
        )}
      </div>
      <div className={st.frameWrap}>
        {state.phase === "idle" && (
          <div className={st.centre}>
            <EmptyState title="Pick a file to read" action={<Button className={st.filesBtn} onClick={onBrowse}>Browse files</Button>}>
              <p>Choose a PDF or notebook from the list.</p>
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
            <iframe key={state.url} className={st.frame} src={state.url} title={file ? fileName(file.path) : "PDF"} />
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
