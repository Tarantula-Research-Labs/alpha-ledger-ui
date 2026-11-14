"use client";

// Share button on the results dashboard: create a read-only link to the path being viewed,
// copy it, and see or revoke the links already made for this path.
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/core/api";
import { formatDate } from "@/core/format";
import { Button, Dialog } from "@/core/ui";
import { newestPush } from "@/features/results/data";
import type { PathConfig } from "@/features/results/types";
import { createShare, listShares, revokeShare, shareStatus, shareUrl, type ShareMeta } from "./shareApi";
import s from "./share.module.css";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? "Copied" : "Copy link"}
    </Button>
  );
}

export function ShareButton({ experiment, section, path }: { experiment: string; section: string; path: PathConfig }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<ShareMeta[] | null>(null);
  const [created, setCreated] = useState<ShareMeta | null>(null);

  const mine = useCallback(
    (all: ShareMeta[]) => all.filter((m) => m.experiment === experiment && m.section === section && m.path_id === path.id),
    [experiment, section, path.id],
  );

  const refresh = useCallback(async () => {
    try {
      setLinks(mine(await listShares()));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load the share links.");
    }
  }, [mine]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function create() {
    if (!path.source) return;
    setBusy(true);
    setError(null);
    try {
      const { version } = await newestPush(experiment, section, path.source.zip);
      const artifacts = Object.values(path.artifacts).filter((a): a is string => !!a);
      const m = await createShare({
        experiment,
        section,
        zip: path.source.zip,
        version,
        mlflow_experiment: path.source.experiment,
        artifacts,
        path_id: path.id,
        path_title: path.title,
        days,
      });
      setCreated(m);
      void refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't create the link.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(m: ShareMeta) {
    if (!window.confirm("Revoke this link? Anyone who has it will no longer be able to open the report.")) return;
    try {
      await revokeShare(m.code);
      if (created?.code === m.code) setCreated(null);
      void refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't revoke the link.");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Share</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Share ${path.title}`} wide>
        <p className={s.note}>
          Creates a read-only link to a frozen copy of this path&apos;s results, as they are now. Anyone with the link can view this
          dashboard without logging in, and nothing else in Alpha Ledger. It keeps working when the server is off.
        </p>

        <div className={s.createRow}>
          <label className={s.label} htmlFor="share-days">
            Valid for
          </label>
          <select id="share-days" className={s.select} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
          <Button variant="primary" onClick={() => void create()} disabled={busy}>
            {busy ? "Creating…" : "Create link"}
          </Button>
        </div>

        {created && (
          <div className={s.newLink}>
            <code className={s.url}>{shareUrl(created.code)}</code>
            <CopyButton text={shareUrl(created.code)} />
          </div>
        )}
        {error && <p className={s.error}>{error}</p>}

        <h3 className={s.subhead}>Links for this path</h3>
        {links === null ? (
          <p className={s.note}>Loading…</p>
        ) : links.length === 0 ? (
          <p className={s.note}>No links yet.</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Created</th>
                <th scope="col">Valid until</th>
                <th scope="col">Results version</th>
                <th scope="col">Status</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {links.map((m) => {
                const st = shareStatus(m);
                return (
                  <tr key={m.code}>
                    <td>{formatDate(m.created_at)}</td>
                    <td>{formatDate(m.expires_at)}</td>
                    <td>v{m.version}</td>
                    <td>
                      <span className={`${s.pill} ${s[st]}`}>{st}</span>
                    </td>
                    <td className={s.actions}>
                      {st === "active" && (
                        <>
                          <CopyButton text={shareUrl(m.code)} />
                          <Button variant="quiet" onClick={() => void revoke(m)}>
                            Revoke
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Dialog>
    </>
  );
}
