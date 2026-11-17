import type { Metadata } from "next";
import { RecordsPage } from "@/features/records/RecordsPage";
import { SECTION_META } from "@/sections/registry";

export const metadata: Metadata = { title: "Research records" };

export default function Records() {
  return <RecordsPage phases={SECTION_META.map((s) => ({ folder: s.folder, label: `${s.number} ${s.title}` }))} />;
}
