import type { Metadata } from "next";
import { ComingSoon } from "@/features/study/ComingSoon";

export const metadata: Metadata = { title: "Study: Machine Learning" };

export default function Page() {
  return <ComingSoon title="Machine Learning" />;
}
