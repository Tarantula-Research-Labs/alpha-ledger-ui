import type { ReactNode } from "react";
import { StudyFrame } from "@/features/study/StudyFrame";

export default function StudyLayout({ children }: { children: ReactNode }) {
  return <StudyFrame>{children}</StudyFrame>;
}
