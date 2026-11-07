import type { Metadata } from "next";
import { StatusView } from "@/features/health/StatusView";
import { SECTION_META } from "@/sections/registry";

export const metadata: Metadata = { title: "Server status" };

export default function StatusPage() {
  return <StatusView uiSections={SECTION_META} />;
}
