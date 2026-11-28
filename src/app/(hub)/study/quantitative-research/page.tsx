import type { Metadata } from "next";
import { ComingSoon } from "@/features/study/ComingSoon";

export const metadata: Metadata = { title: "Study: Quantitative Research" };

export default function Page() {
  return <ComingSoon title="Quantitative Research" />;
}
