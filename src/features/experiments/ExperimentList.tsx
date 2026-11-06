"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/core/format";
import type { SectionMeta } from "@/core/sections";
import { Button, identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { allVersions, datasetsFor, lastSaved } from "@/data/queries";
import { CreateExperimentDialog } from "./CreateExperimentDialog";
import { SectionCoverage } from "./SectionCoverage";
import x from "./experiments.module.css";

export function ExperimentList({ sections }: { sections: SectionMeta[] }) {
  const { experiments, datasets } = useLedger();
  const [creating, setCreating] = useState(false);
  const rows = [...experiments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <header className={x.pageHead}>
        <div>
          <h1 className={x.pageTitle}>Experiments</h1>
          <p className={x.lead}>
            Each experiment keeps its own frozen data, features, labels and models. Every save is a new version, and nothing
            is overwritten.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          New experiment
        </Button>
      </header>

      <div className={x.tableWrap}>
        <table className={x.ledger}>
          <thead>
            <tr>
              <th scope="col">Experiment</th>
              <th scope="col">Sections with saves</th>
              <th scope="col" className={x.num}>
                Versions
              </th>
              <th scope="col">Last save</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const last = lastSaved(datasets, e.name);
              const filled = new Set(datasetsFor(datasets, e.name).map((d) => d.section));
              return (
                <tr key={e.name}>
                  <td>
                    <Link href={`/experiments/${e.name}`} className={`${x.expName} ${identClass}`}>
                      {e.name}
                    </Link>
                    {e.description && <p className={x.expDesc}>{e.description}</p>}
                  </td>
                  <td>
                    <SectionCoverage sections={sections} filled={filled} />
                  </td>
                  <td className={x.num}>{allVersions(datasets, e.name).length}</td>
                  <td className={x.date}>{last ? formatDate(last) : <span className={x.muted}>Nothing yet</span>}</td>
                  <td className={x.date}>{formatDate(e.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CreateExperimentDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
