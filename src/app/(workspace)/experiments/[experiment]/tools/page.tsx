import type { Metadata } from "next";
import { ToolsPage } from "@/features/tools/ToolsPage";

type Props = { params: Promise<{ experiment: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `Tools, ${experiment}` };
}

export default function Tools() {
  return <ToolsPage />;
}
