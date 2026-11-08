"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/core/api";
import { NOTEBOOK_API_URL } from "@/core/config";
import type { SectionMeta } from "@/core/sections";
import { Button, PageHeader, Panel, identClass } from "@/core/ui";
import h from "./health.module.css";
import { MachinePanel } from "./MachinePanel";

// Live from the FastAPI server: everything on this page is live.

interface AwsHealth {
  status: "ok" | "error";
  region: string;
  checks: Record<string, string>;
}
type Row = { what: string; detail?: string; ok: boolean; result: string };

const LABELS: Record<string, string> = { s3: "S3 bucket", dynamodb: "DynamoDB table" };

export function StatusView({ uiSections }: { uiSections: SectionMeta[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [down, setDown] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setBusy(true);
    try {
      const health = await apiGet<{ status: string } | null>("/health");
      if (health?.status !== "ok") throw new Error("down");
      const [aws, sections] = await Promise.all([
        apiGet<AwsHealth>("/health/aws"),
        apiGet<{ folder: string }[]>("/sections"),
      ]);
      const next: Row[] = [{ what: "Server", detail: NOTEBOOK_API_URL, ok: true, result: "Running" }];
      for (const [key, result] of Object.entries(aws.checks)) {
        const [kind, name] = key.split(":");
        next.push({ what: LABELS[kind] ?? kind, detail: name, ok: result === "ok", result: result === "ok" ? "Reachable" : result });
      }
      const serverFolders = sections.map((s) => s.folder).join(",");
      const uiFolders = uiSections.map((s) => s.folder).join(",");
      next.push({
        what: "Sections",
        detail: `${sections.length} on the server, ${uiSections.length} in the UI`,
        ok: serverFolders === uiFolders,
        result: serverFolders === uiFolders ? "Match" : "Different lists",
      });
      setRows(next);
      setDown(false);
    } catch {
      setRows(null);
      setDown(true);
    } finally {
      setCheckedAt(new Date());
      setBusy(false);
    }
  }, [uiSections]);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <>
      <PageHeader
        title="Server status"
        sub="Live checks from the FastAPI server: is it running, and can it reach your bucket and tables."
        actions={
          <Button onClick={() => void check()} disabled={busy}>
            {busy ? "Checking" : "Check again"}
          </Button>
        }
      />

      <MachinePanel onRunning={() => void check()} />

      {down && (
        <div className={h.down} role="alert">
          <strong>The server isn&apos;t responding at {NOTEBOOK_API_URL}.</strong>
          <p>If the machine is stopped, start it above.</p>
        </div>
      )}

      {rows && (
        <Panel title="Checks" icon flush>
        <table className={h.table}>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.what}-${r.detail}`}>
                <th scope="row">
                  {r.what}
                  {r.detail && <span className={`${h.detail} ${identClass}`}>{r.detail}</span>}
                </th>
                <td className={r.ok ? h.ok : h.bad}>{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </Panel>
      )}

      {checkedAt && <p className={h.when}>Last checked at {checkedAt.toLocaleTimeString("en-IN", { hour12: false })}</p>}
    </>
  );
}
