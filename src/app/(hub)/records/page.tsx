import type { Metadata } from "next";
import { RecordsPage } from "@/features/records/RecordsPage";

export const metadata: Metadata = { title: "Research records" };

export default function Records() {
  return <RecordsPage />;
}
