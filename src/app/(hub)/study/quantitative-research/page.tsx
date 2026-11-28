import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyPage } from "@/features/study/StudyPage";

export const metadata: Metadata = { title: "Study: Quantitative Research" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudyPage section="quantitative-research" />
    </Suspense>
  );
}
