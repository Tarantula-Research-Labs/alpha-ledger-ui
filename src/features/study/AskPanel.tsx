"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, inputClass } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { askStudy, askTargetOf, clearChat, errorText, fileName, loadChat, type ChatMessage, type StudyFile, type StudySection } from "./study";
import a from "./ask.module.css";

// KaTeX and the Markdown renderer are only fetched when the first answer is shown.
const AskMarkdown = dynamic(() => import("./AskMarkdown").then((m) => m.AskMarkdown), {
  ssr: false,
  loading: () => <p className={a.plain}>…</p>,
});

/** A PDF with more pages than this lets you choose which pages Gemini reads. */
const BIG_PDF_PAGES = 100;

type Chat = { key: string; messages: ChatMessage[]; sig: string };
type Loading = { key: string; error: string | null };

const pagesLabel = (m: ChatMessage) =>
  m.firstPage !== undefined && m.lastPage !== undefined ? `Pages ${m.firstPage}–${m.lastPage}` : m.page !== undefined ? `Page ${m.page}` : null;

interface Props {
  section: StudySection;
  file: StudyFile | null;
  /** Pages in the open PDF (null for anything else, or while it loads). */
  pages: number | null;
  onClose: () => void;
}

// Ask Gemini about the open file. The conversation is saved on the server, one per file, and comes back when you reopen it.
export function AskPanel({ section, file, pages, onClose }: Props) {
  const target = file ? askTargetOf(section, file) : null;
  const key = target ? `${target.section}|${target.source}|${target.path}` : null;
  const keyRef = useRef(key);
  keyRef.current = key;

  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState<Loading | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ key: string; question: string } | null>(null);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  const [scope, setScope] = useState<"all" | "range">("all");
  const [first, setFirst] = useState("1");
  const [last, setLast] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [retry, setRetry] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  // Load the saved conversation of the open file.
  useEffect(() => {
    if (!file || !key) return;
    const t = askTargetOf(section, file);
    let live = true;
    setLoading({ key, error: null });
    loadChat(t)
      .then((c) => {
        if (!live) return;
        setChat({ key, messages: c.messages, sig: c.sig });
        setLoading(null);
      })
      .catch((e) => {
        if (live) setLoading({ key, error: errorText(e, "The conversation couldn't be loaded.") });
      });
    return () => {
      live = false;
    };
    // The file's path decides what to load; the rest of the file object changing (a badge, say) must not reload it.
  }, [section, key, retry]);

  // A new file starts with the whole file as the scope.
  useEffect(() => {
    setScope("all");
    setFirst("1");
    setLast(pages ? String(pages) : "");
  }, [key, pages]);

  const shown = chat && chat.key === key ? chat : null;
  const waiting = pending && pending.key === key ? pending : null;
  const failure = error && error.key === key ? error.text : null;
  const big = file?.kind === "pdf" && pages !== null && pages > BIG_PDF_PAGES;

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown?.messages.length, waiting]);

  async function send() {
    const question = draft.trim();
    if (!file || !target || !key || !shown || waiting || !question) return;
    let range: { first: number; last: number } | undefined;
    if (big && scope === "range") {
      const f = Number(first);
      const l = Number(last);
      if (!Number.isInteger(f) || !Number.isInteger(l) || f < 1 || l < f || l > (pages ?? 0)) {
        setError({ key, text: `Give a first and last page between 1 and ${pages}, with the last not before the first.` });
        return;
      }
      range = { first: f, last: l };
    }
    setError(null);
    setPending({ key, question });
    setDraft("");
    try {
      const reply = await askStudy(target, question, range);
      const asked: ChatMessage = { role: "user", text: question, at: new Date().toISOString(), sig: reply.sig, firstPage: range?.first, lastPage: range?.last };
      setChat((c) => (c && c.key === key ? { ...c, messages: [...c.messages, asked, reply] } : c));
    } catch (e) {
      if (keyRef.current === key) setDraft((d) => d || question); // keep the question, so it can be sent again
      setError({ key, text: errorText(e, "Couldn't get an answer.") });
    } finally {
      setPending((p) => (p && p.key === key ? null : p));
    }
  }

  async function startNew() {
    if (!target || !key) return;
    setClearing(true);
    try {
      await clearChat(target);
      setChat((c) => (c && c.key === key ? { ...c, messages: [] } : c));
      setConfirmNew(false);
      setError(null);
    } catch (e) {
      setError({ key, text: errorText(e, "Couldn't start a new chat.") });
      setConfirmNew(false);
    } finally {
      setClearing(false);
    }
  }

  return (
    <aside className={a.pane} aria-label="Ask Gemini">
      <div className={a.head}>
        <div className={a.headTitle}>
          <strong>Ask Gemini</strong>
          {file && <span className={a.headFile}>{fileName(file.path)}</span>}
        </div>
        {shown && shown.messages.length > 0 && (
          <Button variant="quiet" onClick={() => setConfirmNew(true)} disabled={waiting !== null}>
            New chat
          </Button>
        )}
        <Button variant="quiet" onClick={onClose}>
          Close
        </Button>
      </div>

      {!file ? (
        <p className={a.empty}>Open a file, then ask about it here.</p>
      ) : loading && loading.key === key ? (
        <div className={a.centre}>
          {loading.error ? (
            <>
              <p>{loading.error}</p>
              <Button onClick={() => setRetry((n) => n + 1)}>Try again</Button>
            </>
          ) : (
            <GearSpinner label="Loading the conversation…" />
          )}
        </div>
      ) : (
        <>
          <div ref={list} className={a.list} role="log" aria-live="polite">
            {shown && shown.messages.length === 0 && !waiting && (
              <div className={a.empty}>
                <p>Ask anything about this file: what a part means, a summary of a section, a worked example.</p>
                <p className={a.hint}>Gemini reads the file itself, so it can cite pages. Maths is shown as typeset equations.</p>
              </div>
            )}
            {shown?.messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className={a.user}>
                  {pagesLabel(m) && <span className={a.tag}>{pagesLabel(m)}</span>}
                  {m.quote && <blockquote className={a.quote}>{m.quote}</blockquote>}
                  <p>{m.text}</p>
                </div>
              ) : (
                <div key={i} className={a.model}>
                  <AskMarkdown text={m.text} />
                  {m.sig !== shown.sig && <p className={a.note}>About an older version of this file.</p>}
                  {m.fallback && <p className={a.note}>A lite model answered{m.model ? ` (${m.model})` : ""} because the main models were busy or too slow.</p>}
                </div>
              ),
            )}
            {waiting && (
              <>
                <div className={a.user}>
                  <p>{waiting.question}</p>
                </div>
                <div className={a.model}>
                  <GearSpinner label="Gemini is reading the file… this can take up to a minute when it is busy." />
                </div>
              </>
            )}
          </div>

          <div className={a.compose}>
            {failure && (
              <p className={a.error} role="alert">
                {failure}
              </p>
            )}
            {big && (
              <div className={a.scope}>
                <span className={a.hint}>This PDF has {pages} pages.</span>
                <label>
                  <input type="radio" name="ask-scope" checked={scope === "all"} onChange={() => setScope("all")} /> Whole file
                </label>
                <label>
                  <input type="radio" name="ask-scope" checked={scope === "range"} onChange={() => setScope("range")} /> Pages
                </label>
                {scope === "range" && (
                  <span className={a.range}>
                    <input className={inputClass} type="number" inputMode="numeric" min={1} max={pages ?? undefined} value={first} onChange={(e) => setFirst(e.target.value)} aria-label="First page" />
                    <span>–</span>
                    <input className={inputClass} type="number" inputMode="numeric" min={1} max={pages ?? undefined} value={last} onChange={(e) => setLast(e.target.value)} aria-label="Last page" />
                  </span>
                )}
              </div>
            )}
            <textarea
              className={`${inputClass} ${a.box}`}
              rows={3}
              value={draft}
              placeholder="Ask about this file…"
              aria-label="Your question"
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className={a.sendRow}>
              <span className={a.hint}>Ctrl+Enter sends</span>
              <Button variant="primary" onClick={() => void send()} disabled={!shown || waiting !== null || !draft.trim()}>
                {waiting ? "Asking…" : "Ask"}
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={confirmNew} onClose={() => setConfirmNew(false)} title="Start a new chat?">
        <div className={a.dialog}>
          <p>The conversation about this file is cleared here. A copy stays in storage, so nothing is lost for good.</p>
          <div className={a.dialogActions}>
            <Button variant="quiet" onClick={() => setConfirmNew(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void startNew()} disabled={clearing}>
              {clearing ? "Clearing…" : "New chat"}
            </Button>
          </div>
        </div>
      </Dialog>
    </aside>
  );
}
