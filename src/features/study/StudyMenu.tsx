"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDY_SECTIONS } from "./study";
import st from "./study.module.css";

// The menu inside Study: a column on the left; a row of tabs on tablets and phones.
export function StudyMenu() {
  const pathname = usePathname();
  return (
    <nav className={st.menu} aria-label="Study sections">
      {STUDY_SECTIONS.map((x) => (
        <Link key={x.href} href={x.href} className={st.menuLink} aria-current={pathname === x.href ? "page" : undefined}>
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
