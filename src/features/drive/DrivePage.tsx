"use client";

import { useState } from "react";
import { PageHeader, Tabs } from "@/core/ui";
import { ServerGate } from "@/features/experiments/ServerGate";
import { DriveFiles } from "./DriveFiles";
import { DriveNotes } from "./DriveNotes";
import d from "./drive.module.css";

type Tab = "files" | "notes";

// One place for anything that belongs to no single experiment: files, notes and code snippets.
export function DrivePage() {
  const [tab, setTab] = useState<Tab>("files");
  return (
    <>
      <PageHeader title="Drive" sub="Files, notes and code snippets that belong to no single experiment." />
      <ServerGate>
        <div className={d.tabs}>
          <Tabs
            label="Drive"
            tabs={[
              { id: "files", label: "Files" },
              { id: "notes", label: "Notes & snippets" },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
        {tab === "files" ? <DriveFiles /> : <DriveNotes />}
      </ServerGate>
    </>
  );
}
