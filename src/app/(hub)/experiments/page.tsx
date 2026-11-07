import type { Metadata } from "next";
import { ExperimentList } from "@/features/experiments/ExperimentList";
import { SECTION_META } from "@/sections/registry";

export const metadata: Metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  return <ExperimentList sections={SECTION_META} />;
}
