"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatCount, formatDate, refLabel, versionHref } from "@/core/format";
import { Button, EmptyState, StatusMark, identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor } from "@/data/queries";
import { SaveDialog } from "./SaveDialog";
import v from "./versions.module.css";

// Datasets in one section of one experiment, each with all its versions (newest first).
// Meant to sit inside a flush Panel.
export function DatasetList({
  experiment,
  section,
  filter,
  emptyText,
}: {
  experiment: string;
  section: string;
  filter?: (name: string) => boolean;
  emptyText: string;
}) {
  const { datasets } = useLedger();
  const params = useSearchParams();
  const [saving, setSaving] = useState<string | null>(null);
  const list = datasetsFor(datasets, experiment, section).filter((d) => d.kind === "table" && (!filter || filter(d.name)));

  const selDataset = params.get("dataset");
  const selVersion = Number(params.get("v"));

  if (list.length === 0) {
    return (
      <div className={v.emptyWrap}>
        <EmptyState title="Nothing saved yet.">
          <p>{emptyText}</p>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {list.map((d) => (
        <div key={d.name} className={v.dataset}>
          <div className={v.datasetHead}>
            <h3 className={`${v.datasetName} ${identClass}`}>{d.name}</h3>
            <span className={v.datasetCount}>
              {d.versions.length} {d.versions.length === 1 ? "version" : "versions"}
            </span>
            <Button variant="quiet" onClick={() => setSaving(d.name)}>
              Save snippet
            </Button>
          </div>
          <div className={v.tableWrap}>
            <table className={v.versions}>
              <thead>
                <tr>
                  <th scope="col">Version</th>
                  <th scope="col">Status</th>
                  <th scope="col">Saved</th>
                  <th scope="col" className={v.num}>
                    Rows
                  </th>
                  <th scope="col" className={v.num}>
                    Columns
                  </th>
                  <th scope="col">Built from</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...d.versions].reverse().map((ver) => {
                  const selected = selDataset === d.name && selVersion === ver.ref.version;
                  return (
                    <tr key={ver.ref.version} className={selected ? v.selected : undefined}>
                      <td>
                        <Link href={versionHref(ver.ref)} scroll={false} className={v.versionLink} aria-current={selected ? "true" : undefined}>
                          v{ver.ref.version}
                        </Link>
                      </td>
                      <td>
                        <StatusMark status={ver.status} />
                      </td>
                      <td className={v.nowrap}>{formatDate(ver.createdAt)}</td>
                      <td className={v.num}>{ver.rows !== undefined ? formatCount(ver.rows) : "–"}</td>
                      <td className={v.num}>{ver.columns ? ver.columns.length : "–"}</td>
                      <td className={v.inputs}>
                        {ver.reusedFrom ? (
                          <>Reused: {refLabel(ver.reusedFrom, experiment)}</>
                        ) : ver.inputs.length ? (
                          ver.inputs.map((i) => refLabel(i, experiment)).join(", ")
                        ) : (
                          "trl_datalake"
                        )}
                      </td>
                      <td className={v.notes}>{ver.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <SaveDialog open={saving !== null} onClose={() => setSaving(null)} experiment={experiment} section={section} dataset={saving ?? undefined} />
    </>
  );
}
