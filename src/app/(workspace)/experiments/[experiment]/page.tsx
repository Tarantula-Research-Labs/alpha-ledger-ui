import type { Metadata } from "next";
import { ExperimentDashboard } from "@/features/experiments/ExperimentDashboard";
import { SECTION_META } from "@/sections/registry";

type Props = { params: Promise<{ experiment: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `Dashboard, ${experiment}` };
}

export default async function ExperimentDashboardPage({ params }: Props) {
  const { experiment } = await params;
  return <ExperimentDashboard experiment={experiment} sections={SECTION_META} />;
}
