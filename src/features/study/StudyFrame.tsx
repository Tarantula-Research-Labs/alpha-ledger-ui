import type { ReactNode } from "react";
import { StudyMenu } from "./StudyMenu";
import st from "./study.module.css";

// The frame around every Study section: the section menu, then the section's page.
export function StudyFrame({ children }: { children: ReactNode }) {
  return (
    <div className={st.frame}>
      <StudyMenu />
      <div className={st.content}>{children}</div>
    </div>
  );
}
