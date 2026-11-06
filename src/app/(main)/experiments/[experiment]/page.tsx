import type { Metadata } from "next";
import { ExperimentGuard } from "@/features/experiments/ExperimentGuard";
import { ExperimentOverview } from "@/features/experiments/ExperimentOverview";
import { SECTION_META } from "@/sections/registry";

type Props = { params: Promise<{ experiment: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment } = await params;
  return { title: experiment };
}

export default async function ExperimentPage({ params }: Props) {
  const { experiment } = await params;
  return (
    <ExperimentGuard experiment={experiment}>
      <ExperimentOverview experiment={experiment} sections={SECTION_META} />
    </ExperimentGuard>
  );
}
