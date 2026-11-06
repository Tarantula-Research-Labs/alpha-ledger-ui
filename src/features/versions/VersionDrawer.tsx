"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, identClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import { findVersion } from "@/data/queries";
import { VersionDetails } from "./VersionDetails";

// Opens from the address (?dataset=...&v=...), so a version can be linked to directly.
export function VersionDrawer({ experiment, section }: { experiment: string; section: string }) {
  const { datasets } = useLedger();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const dataset = params.get("dataset");
  const v = Number(params.get("v"));
  const version = dataset && v ? findVersion(datasets, { experiment, section, dataset, version: v }) : undefined;

  return (
    <Dialog
      variant="drawer"
      open={Boolean(version)}
      onClose={() => router.replace(pathname, { scroll: false })}
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
      {version && <VersionDetails version={version} />}
    </Dialog>
  );
}
