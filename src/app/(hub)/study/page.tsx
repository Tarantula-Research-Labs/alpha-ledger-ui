import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyPage } from "@/features/study/StudyPage";

export const metadata: Metadata = { title: "Study: MScFE" };

export default function Study() {
  return (
    <Suspense fallback={null}>
      <StudyPage section="mscfe" />
    </Suspense>
  );
}
