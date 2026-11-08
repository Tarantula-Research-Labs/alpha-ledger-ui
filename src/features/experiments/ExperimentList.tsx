"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/core/format";
import type { SectionMeta } from "@/core/sections";
import { EmptyState, PageHeader, identClass } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { useLedger } from "@/data/LedgerProvider";
import { allVersions, datasetsFor, lastSaved } from "@/data/queries";
import { CreateExperimentDialog } from "./CreateExperimentDialog";
import { SectionCoverage } from "./SectionCoverage";
import { ServerGate } from "./ServerGate";
import x from "./experiments.module.css";

// All experiments as cards. Opening one goes to that experiment's dashboard.
// The cards show only once the server is up (see ServerGate).
export function ExperimentList({ sections }: { sections: SectionMeta[] }) {
  return (
    <>
      <PageHeader
        title="Your experiments"
        sub="Pick an experiment to open its dashboard. Each one keeps its own frozen data, features, labels and models, and nothing saved is ever overwritten."
      />
      <ServerGate>
        <ExperimentCards sections={sections} />
      </ServerGate>
    </>
  );
}

function ExperimentCards({ sections }: { sections: SectionMeta[] }) {
  const { experiments, datasets, loading } = useLedger();
  const [creating, setCreating] = useState(false);

  // Until the list has arrived from the server: only "Loading experiments…".
  // No cards, no "No experiments yet" and no New experiment card.
  if (loading) {
    return <GearSpinner label="Loading experiments…" />;
  }

  const rows = [...experiments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      {rows.length === 0 && (
        <div className={x.firstRun}>
          <EmptyState title="No experiments yet.">
            <p>
              Create your first experiment to begin. You&apos;ll go straight to its Data Pipeline, where the first snippet connects your
              notebook to the database.
            </p>
          </EmptyState>
        </div>
      )}

      <ul className={x.cards}>
        {rows.map((e) => {
          const last = lastSaved(datasets, e.name);
          const filled = new Set(datasetsFor(datasets, e.name).map((d) => d.section));
          const count = allVersions(datasets, e.name).length;
          return (
            <li key={e.name}>
              <Link href={`/experiments/${e.name}`} className={x.card}>
                <span className={x.cardTop}>
                  <span className={`${x.cardName} ${identClass}`}>{e.name}</span>
                  <span className={x.cardOpen} aria-hidden="true">
                    ›
                  </span>
                </span>
                <span className={x.cardDesc}>{e.description || "No description."}</span>
                <span className={x.cardCoverage}>
                  <span className={x.cardLabel}>Sections with saves</span>
                  <SectionCoverage sections={sections} filled={filled} />
                </span>
                <span className={x.cardStats}>
                  <span>
                    <span className={x.cardLabel}>Versions</span>
                    <span className={x.cardValue}>{count}</span>
                  </span>
                  <span>
                    <span className={x.cardLabel}>Last save</span>
                    <span className={x.cardValue}>{last ? formatDate(last) : "Nothing yet"}</span>
                  </span>
                  <span>
                    <span className={x.cardLabel}>Created</span>
                    <span className={x.cardValue}>{formatDate(e.createdAt)}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" className={x.newCard} onClick={() => setCreating(true)}>
            <span className={x.newPlus} aria-hidden="true">
              +
            </span>
            <span className={x.newTitle}>New experiment</span>
            <span className={x.cardDesc}>Name it, then pull its data fresh from trl_datalake.</span>
          </button>
        </li>
      </ul>

      <CreateExperimentDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
