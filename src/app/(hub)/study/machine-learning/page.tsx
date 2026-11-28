import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyPage } from "@/features/study/StudyPage";

export const metadata: Metadata = { title: "Study: Machine Learning" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudyPage section="machine-learning" />
    </Suspense>
  );
}
