"use client";

import Link from "next/link";
import { formatDate } from "@/core/format";
import type { SectionMeta } from "@/core/sections";
import { Breadcrumbs, VersionTicks, identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { datasetsFor, lastVersion, latestComplete } from "@/data/queries";
import x from "./experiments.module.css";

// The ledger spine: the six sections down the left, every saved version as a tick.
export function ExperimentOverview({ experiment, sections }: { experiment: string; sections: SectionMeta[] }) {
  const { experiments, datasets } = useLedger();
  const exp = experiments.find((e) => e.name === experiment);
  if (!exp) return null;

  return (
    <>
      <Breadcrumbs items={[{ label: "Experiments", href: "/experiments" }, { label: experiment }]} />
      <header className={x.expHead}>
        <h1 className={`${x.expTitle} ${identClass}`}>{exp.name}</h1>
        {exp.description && <p className={x.lead}>{exp.description}</p>}
        <p className={x.meta}>Created {formatDate(exp.createdAt)}</p>
      </header>

      <ol className={x.spine} aria-label="Sections in pipeline order">
        {sections.map((sec) => {
          const ds = datasetsFor(datasets, experiment, sec.folder);
          return (
            <li key={sec.folder} className={x.spineRow} data-active={sec.active}>
              <Link href={`/experiments/${experiment}/${sec.folder}`} className={x.spineLink}>
                <span className={x.spineNum} aria-hidden="true">
                  {sec.number}
                </span>
                <span className={x.spineBody}>
                  <span className={x.spineTitle}>
                    <span className="sr-only">{sec.number} </span>
                    {sec.title}
                  </span>
                  {!sec.active ? (
                    <span className={x.spineNote}>Skipped for now</span>
                  ) : ds.length === 0 ? (
                    <span className={x.spineNote}>Nothing saved yet</span>
                  ) : (
                    <span className={x.entries}>
                      {ds.map((d) => {
                        const latest = latestComplete(d);
                        const last = lastVersion(d);
                        return (
                          <span key={d.name} className={x.entry}>
                            <span className={`${x.entryName} ${identClass}`}>{d.name}</span>
                            <VersionTicks versions={d.versions.map((v) => ({ version: v.ref.version, status: v.status }))} />
                            <span className={x.entryMeta}>
                              {latest ? `v${latest.ref.version}, ${formatDate(latest.createdAt)}` : "No complete version"}
                              {last && last.status === "failed" ? `. v${last.ref.version} failed` : ""}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
