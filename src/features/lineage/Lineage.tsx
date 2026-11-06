"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { folderLabel, refKey, refLabel, versionHref } from "@/core/format";
import type { VersionRef } from "@/core/types";
import { identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { findVersion, usedBy } from "@/data/queries";
import l from "./lineage.module.css";

// What a version was built from (all the way back) and what was built from it.
// Reads only version records, so it works for any section, including future ones.
export function Lineage({ of }: { of: VersionRef }) {
  const { datasets } = useLedger();
  const version = findVersion(datasets, of);
  const downstream = usedBy(datasets, of);

  function upstream(r: VersionRef, seen: Set<string>): ReactNode {
    const v = findVersion(datasets, r);
    const inputs = v?.inputs ?? [];
    if (inputs.length === 0) return null;
    return (
      <ul className={l.tree}>
        {inputs.map((i) => {
          const key = refKey(i);
          const loop = seen.has(key);
          return (
            <li key={key}>
              <Node r={i} current={of.experiment} />
              {!loop && upstream(i, new Set([...seen, key]))}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={l.lineage}>
      <div>
        <h4 className={l.heading}>Built from</h4>
        {version && version.inputs.length > 0 ? (
          upstream(of, new Set([refKey(of)]))
        ) : (
          <p className={l.none}>{of.section.startsWith("01_") ? "Pulled from trl_datalake." : "Nothing recorded."}</p>
        )}
      </div>
      <div>
        <h4 className={l.heading}>Used by</h4>
        {downstream.length > 0 ? (
          <ul className={l.flat}>
            {downstream.map((d) => (
              <li key={refKey(d.ref)}>
                <Node r={d.ref} current={of.experiment} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={l.none}>Nothing built from this yet.</p>
        )}
      </div>
    </div>
  );
}

function Node({ r, current }: { r: VersionRef; current: string }) {
  return (
    <span className={l.node}>
      <Link href={versionHref(r)} className={`${l.link} ${identClass}`}>
        {refLabel(r, current)}
      </Link>
      <span className={l.section}>{folderLabel(r.section)}</span>
    </span>
  );
}
