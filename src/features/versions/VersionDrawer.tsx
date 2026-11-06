"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Dialog, Tabs, identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { findVersion } from "@/data/queries";
import { Lineage } from "@/features/lineage/Lineage";
import { VersionFacts, VersionLoad } from "./VersionDetails";
import v from "./versions.module.css";

type Tab = "details" | "lineage" | "load";
const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "lineage", label: "Lineage" },
  { id: "load", label: "Load in notebook" },
];

// Opens from the address (?dataset=...&v=...), so a version can be linked to directly.
export function VersionDrawer({ experiment, section }: { experiment: string; section: string }) {
  const { datasets } = useLedger();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("details");

  const dataset = params.get("dataset");
  const n = Number(params.get("v"));
  const version = dataset && n ? findVersion(datasets, { experiment, section, dataset, version: n }) : undefined;

  return (
    <Dialog
      variant="drawer"
      open={Boolean(version)}
      onClose={() => {
        setTab("details");
        router.replace(pathname, { scroll: false });
      }}
      title={
        version ? (
          <span className={identClass}>
            {version.ref.dataset} v{version.ref.version}
          </span>
        ) : (
          ""
        )
      }
    >
      {version && (
        <>
          <div className={v.drawerTabs}>
            <Tabs tabs={TABS} active={tab} onChange={setTab} label="Version views" />
          </div>
          <div role="tabpanel">
            {tab === "details" && <VersionFacts version={version} />}
            {tab === "lineage" && <Lineage of={version.ref} />}
            {tab === "load" && <VersionLoad version={version} />}
          </div>
        </>
      )}
    </Dialog>
  );
}
