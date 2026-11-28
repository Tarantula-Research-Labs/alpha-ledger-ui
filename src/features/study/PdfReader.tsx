"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { assetBase, loadPdfjs, type PDFDocumentProxy } from "./pdf";
import type { Passage } from "./study";
import pr from "./pdfReader.module.css";

type Pdfjs = Awaited<ReturnType<typeof loadPdfjs>>;
interface Size {
  w: number; // PDF points at scale 1
  h: number;
}

const GAP = 10; // between pages, in px
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const MAX_CANVAS_PIXELS = 16_000_000; // phones refuse bigger canvases
const MAX_PASSAGE = 6000; // the server takes at most this many characters of a selected passage
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// One page. It draws itself (picture + selectable text) only while it is near the screen, and frees the memory when it isn't.
function Page({ pdfjs, doc, n, scale, size, root }: { pdfjs: Pdfjs; doc: PDFDocumentProxy; n: number; scale: number; size: Size; root: HTMLElement | null }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(n <= 2);
  const width = Math.floor(size.w * scale);
  const height = Math.floor(size.h * scale);

  useEffect(() => {
    if (!box.current || !root) return;
    const io = new IntersectionObserver((e) => setNear(e[0]?.isIntersecting ?? false), { root, rootMargin: "1400px 0px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    const c = canvas.current;
    const t = text.current;
    if (!c || !t) return;
    const free = () => {
      c.width = 0;
      c.height = 0;
      t.replaceChildren();
    };
    if (!near) {
      free();
      return;
    }
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let layer: { cancel: () => void } | null = null;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const out = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)));
      c.width = Math.floor(viewport.width * out);
      c.height = Math.floor(viewport.height * out);
      task = page.render({ canvas: c, viewport, transform: out === 1 ? undefined : [out, 0, 0, out, 0, 0] });
      await task.promise;
      if (cancelled) return;
      t.replaceChildren();
      const tl = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: t, viewport });
      layer = tl;
      await tl.render();
    })().catch(() => {
      // A cancelled render throws; so does a broken page. The page just stays blank.
    });
    return () => {
      cancelled = true;
      task?.cancel();
      layer?.cancel();
    };
  }, [near, scale, doc, pdfjs, n]);

  return (
    <div ref={box} className={pr.page} style={{ width, height, ["--total-scale-factor" as string]: scale, ["--scale-round-x" as string]: "1px", ["--scale-round-y" as string]: "1px" }} data-page={n}>
      <canvas ref={canvas} className={pr.canvas} style={{ width, height }} />
      <div ref={text} className={pr.textLayer} />
    </div>
  );
}

// The PDF, drawn by pdf.js inside the app: continuous pages, zoom, page jump, selectable text.
// It works the same in every browser, unlike the browser's own PDF viewer (phones don't show one inside a page).
// It tells the Ask panel which page is open, and offers "Ask about this" next to a selected passage.
export function PdfReader({ url, onPages, onPage, onPassage }: { url: string; onPages?: (pages: number) => void; onPage?: (page: number) => void; onPassage?: (passage: Passage) => void }) {
  const [pdfjs, setPdfjs] = useState<Pdfjs | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<Size[] | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null); // percent
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [boxWidth, setBoxWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const anchor = useRef<{ page: number; frac: number } | null>(null);
  const reader = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState<{ text: string; page: number; left: number; top: number } | null>(null); // the selected passage and where its button goes
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the file.
  useEffect(() => {
    let dead = false;
    let destroy: (() => void) | null = null;
    setDoc(null);
    setSizes(null);
    setError(null);
    setLoaded(null);
    setCurrent(1);
    (async () => {
      const lib = await loadPdfjs();
      if (dead) return;
      const base = assetBase(lib.version);
      const task = lib.getDocument({
        url,
        // One plain download: simple, and no special rules needed on the S3 bucket.
        disableRange: true,
        disableStream: true,
        cMapUrl: `${base}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${base}standard_fonts/`,
        iccUrl: `${base}iccs/`,
        wasmUrl: `${base}wasm/`,
      });
      destroy = () => void task.destroy();
      task.onProgress = ({ loaded: l, total }: { loaded: number; total: number }) => {
        if (!dead && total > 0) setLoaded(Math.min(100, Math.round((l / total) * 100)));
      };
      const d = await task.promise;
      if (dead) return;
      // Every page's size, so the scroll bar is right from the start.
      const all: Size[] = [];
      for (let i = 1; i <= d.numPages; i += 64) {
        const chunk = await Promise.all(
          Array.from({ length: Math.min(64, d.numPages - i + 1) }, async (_, k) => {
            const v = (await d.getPage(i + k)).getViewport({ scale: 1 });
            return { w: v.width, h: v.height };
          }),
        );
        if (dead) return;
        all.push(...chunk);
      }
      setPdfjs(lib);
      setDoc(d);
      setSizes(all);
      onPages?.(all.length);
    })().catch((e: unknown) => {
      if (dead) return;
      const name = (e as { name?: string } | null)?.name;
      setError(
        name === "PasswordException"
          ? "This PDF is password-protected."
          : name === "InvalidPDFException"
            ? "This file isn't a valid PDF."
            : "The PDF couldn't be loaded. If it keeps failing, use Open in new tab.",
      );
    });
    return () => {
      dead = true;
      destroy?.();
    };
  }, [url]);

  useEffect(() => {
    onPage?.(current);
  }, [current, onPage]);

  // The selected text: look at the selection (after a short pause, so dragging doesn't flicker) and place a button under it.
  const readSelection = useCallback(() => {
    const box = reader.current;
    const sel = window.getSelection();
    if (!box || !root || !sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPick(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const start = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const page = Number(start?.closest("[data-page]")?.getAttribute("data-page"));
    const text = sel.toString().replace(/\s+/g, " ").trim().slice(0, MAX_PASSAGE);
    // The last visible line of the selection. (A selection also reports the big box around all the text; that one is skipped.)
    const view = root.getBoundingClientRect();
    const lines = Array.from(range.getClientRects()).filter((r) => r.width > 1 && r.height < view.height / 2 && r.bottom > view.top && r.top < view.bottom);
    const last = lines[lines.length - 1];
    if (!root.contains(range.commonAncestorContainer) || !page || !text || !last) {
      setPick(null);
      return;
    }
    const b = box.getBoundingClientRect();
    const below = last.bottom - b.top + 8;
    // Under the selection; above it when the bottom bar is in the way. Always inside the reader.
    const top = below > b.height - 96 ? Math.max(8, last.top - b.top - 44) : below;
    setPick({ text, page, left: clamp(last.right - b.left - 60, 8, Math.max(8, b.width - 140)), top });
  }, [root]);

  useEffect(() => {
    const later = () => {
      if (pickTimer.current) clearTimeout(pickTimer.current);
      pickTimer.current = setTimeout(readSelection, 250);
    };
    document.addEventListener("selectionchange", later);
    return () => {
      document.removeEventListener("selectionchange", later);
      if (pickTimer.current) clearTimeout(pickTimer.current);
    };
  }, [readSelection]);

  // Follow the width of the reader, so "fit to width" stays right on rotation, full screen and resize.
  useEffect(() => {
    if (!root) return;
    const ro = new ResizeObserver(() => setBoxWidth(root.clientWidth));
    ro.observe(root);
    setBoxWidth(root.clientWidth);
    return () => ro.disconnect();
  }, [root]);

  const pad = boxWidth < 600 ? 6 : 16;
  const scales = useMemo(() => (sizes ? sizes.map((s) => (Math.max(boxWidth - 2 * pad, 100) / s.w) * zoom) : []), [sizes, boxWidth, pad, zoom]);
  // Where each page starts, from the top of the scroll area.
  const tops = useMemo(() => {
    if (!sizes) return [];
    const t: number[] = [];
    let y = pad;
    sizes.forEach((s, i) => {
      t.push(y);
      y += Math.floor(s.h * scales[i]) + GAP;
    });
    return t;
  }, [sizes, scales, pad]);

  const pageAt = useCallback(
    (scrollTop: number) => {
      let lo = 0;
      let hi = tops.length - 1;
      const y = scrollTop + (root?.clientHeight ?? 0) / 3;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tops[mid] <= y) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    },
    [tops, root],
  );

  const onScroll = useCallback(() => {
    if (root) setCurrent(pageAt(root.scrollTop));
    if (pick) readSelection(); // the button follows its text
  }, [root, pageAt, pick, readSelection]);

  function goTo(n: number) {
    if (!root || !sizes) return;
    const page = clamp(Math.round(n) || 1, 1, sizes.length);
    root.scrollTop = tops[page - 1] - pad;
    setCurrent(page);
  }

  function changeZoom(next: number) {
    if (!root || !sizes) return;
    const page = pageAt(root.scrollTop);
    const h = Math.floor(sizes[page - 1].h * scales[page - 1]);
    anchor.current = { page, frac: h > 0 ? clamp((root.scrollTop - (tops[page - 1] - pad)) / h, 0, 1) : 0 };
    setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM));
  }

  // After a zoom, put the reader back on the same spot of the same page.
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a || !root || !sizes) return;
    anchor.current = null;
    const h = Math.floor(sizes[a.page - 1].h * scales[a.page - 1]);
    root.scrollTop = tops[a.page - 1] - pad + a.frac * h;
  }, [tops, scales, sizes, root, pad]);

  if (error) return <div className={pr.message}>{error}</div>;

  return (
    <div ref={reader} className={pr.reader}>
      <div ref={setRoot} className={pr.scroller} onScroll={onScroll}>
        {doc && pdfjs && sizes ? (
          <div className={pr.pages} style={{ padding: pad, gap: GAP }}>
            {sizes.map((s, i) => (
              <Page key={i} pdfjs={pdfjs} doc={doc} n={i + 1} scale={scales[i]} size={s} root={root} />
            ))}
          </div>
        ) : (
          <div className={pr.message}>
            <GearSpinner label={loaded !== null && loaded < 100 ? `Loading the PDF… ${loaded}%` : "Preparing the PDF…"} />
          </div>
        )}
      </div>
      {pick && onPassage && (
        <button
          type="button"
          className={pr.askPick}
          style={{ left: pick.left, top: pick.top }}
          onMouseDown={(e) => e.preventDefault()} // keeps the text selected while the button is pressed
          onClick={() => {
            onPassage({ text: pick.text, page: pick.page });
            window.getSelection()?.removeAllRanges();
            setPick(null);
          }}
        >
          Ask about this
        </button>
      )}
      {sizes && (
        <div className={pr.bar}>
          <Button variant="quiet" onClick={() => changeZoom(zoom / 1.25)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
            −
          </Button>
          <button type="button" className={pr.zoomValue} onClick={() => changeZoom(1)} title="Fit to width" aria-label="Fit to width">
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="quiet" onClick={() => changeZoom(zoom * 1.25)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
            +
          </Button>
          <span className={pr.sep} aria-hidden="true" />
          <Button variant="quiet" onClick={() => goTo(current - 1)} disabled={current <= 1} aria-label="Previous page">
            ‹
          </Button>
          <label className={pr.pageBox}>
            <input
              key={current}
              className={pr.pageInput}
              type="number"
              inputMode="numeric"
              min={1}
              max={sizes.length}
              defaultValue={current}
              aria-label="Page number"
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  goTo(Number(e.currentTarget.value));
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => goTo(Number(e.currentTarget.value))}
            />
            <span>/ {sizes.length}</span>
          </label>
          <Button variant="quiet" onClick={() => goTo(current + 1)} disabled={current >= sizes.length} aria-label="Next page">
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
