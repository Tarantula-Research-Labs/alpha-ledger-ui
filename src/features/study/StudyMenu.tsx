"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSavedFlag } from "./savedFlag";
import { STUDY_SECTIONS } from "./study";
import st from "./study.module.css";

// The menu inside Study: a column on the left that can be folded away to give the reader room; a row of tabs on tablets and phones.
export function StudyMenu() {
  const pathname = usePathname();
  const [folded, setFolded] = useSavedFlag("study.menuFolded");
  return (
    <nav className={st.menu} data-folded={folded || undefined} aria-label="Study sections">
      <button
        type="button"
        className={st.menuToggle}
        onClick={() => setFolded(!folded)}
        aria-expanded={!folded}
        aria-label={folded ? "Show the section menu" : "Hide the section menu"}
        title={folded ? "Show the section menu" : "Hide the section menu"}
      >
        {folded ? "›" : "‹"}
      </button>
      {STUDY_SECTIONS.map((x) => (
        <Link key={x.href} href={x.href} className={st.menuLink} aria-current={pathname === x.href ? "page" : undefined}>
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
