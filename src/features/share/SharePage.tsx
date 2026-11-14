"use client";

// The public page behind a share link: no sign-in, read-only, one frozen path and nothing else.
// The small "is this link still valid?" check is asked every time; the frozen results are kept by the browser.
import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { formatDate } from "@/core/format";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { LedgerMark } from "@/core/ui/LedgerMark";
import type { Snapshot } from "@/features/results/data";
import { ResultsView } from "@/features/results/ResultsView";
import type { PathConfig } from "@/features/results/types";
import type { ShareMeta } from "./shareApi";
import s from "./share.module.css";

type PublicMeta = Pick<ShareMeta, "experiment" | "section" | "path_id" | "path_title" | "created_at" | "expires_at" | "version">;

export function SharePage({ code, resolvePath }: { code: string; resolvePath: (section: string, pathId: string) => PathConfig | undefined }) {
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const m = await apiRequest<PublicMeta>(`/share/${code}?part=meta`);
        if (!live) return;
        setMeta(m);
        const d = await apiRequest<Snapshot>(`/share/${code}?part=data&v=${m.version}`, { cache: "default" });
        if (live) setData(d);
      } catch (e) {
        if (live) setError(e instanceof ApiError ? e.message : "This report couldn't be loaded.");
      }
    })();
    return () => {
      live = false;
    };
  }, [code]);

  const path = meta ? resolvePath(meta.section, meta.path_id) : undefined;

  return (
    <div className={s.page} data-wide-page>
      <header className={s.top}>
        <LedgerMark size={26} />
        <span className={s.brand}>Alpha Ledger</span>
        <span className={s.badge}>Shared report · read-only</span>
        {meta && (
          <span className={s.dates}>
            Shared {formatDate(meta.created_at)} · valid until {formatDate(meta.expires_at)}
          </span>
        )}
      </header>
      <main className={s.main}>
        {error ? (
          <div className={s.message}>
            <h1>This link isn&apos;t available</h1>
            <p>{error}</p>
          </div>
        ) : !meta || !data ? (
          <GearSpinner label="Loading the report…" />
        ) : !path ? (
          <div className={s.message}>
            <h1>This report can&apos;t be shown</h1>
            <p>The app no longer knows how to draw this path.</p>
          </div>
        ) : (
          <>
            <p className={s.context}>
              {meta.experiment} · {meta.section.replace(/_/g, " ")}
            </p>
            <ResultsView experiment={meta.experiment} section={meta.section} paths={[path]} snapshot={data} />
          </>
        )}
      </main>
    </div>
  );
}
