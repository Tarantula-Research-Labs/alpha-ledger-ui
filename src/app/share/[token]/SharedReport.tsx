"use client";

// Links a share code to the section's path list, so the shared page knows how to draw the path.
import { SharePage } from "@/features/share/SharePage";
import { BASELINE_PATHS } from "@/sections/s05_baseline_research/paths";

const PATHS_BY_SECTION: Record<string, typeof BASELINE_PATHS> = {
  "05_baseline_research": BASELINE_PATHS,
};

export function SharedReport({ code }: { code: string }) {
  return <SharePage code={code} resolvePath={(section, pathId) => PATHS_BY_SECTION[section]?.find((p) => p.id === pathId)} />;
}
