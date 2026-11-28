"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import st from "./study.module.css";

// The Study sections. To add one: one line here, plus its page under app/(hub)/study.
const SECTIONS = [
  { href: "/study", label: "MScFE" },
  { href: "/study/machine-learning", label: "Machine Learning" },
  { href: "/study/deep-learning", label: "Deep Learning" },
  { href: "/study/quantitative-research", label: "Quantitative Research" },
];

// The menu inside Study: a column on the left; a row of tabs on tablets and phones.
export function StudyMenu() {
  const pathname = usePathname();
  return (
    <nav className={st.menu} aria-label="Study sections">
      {SECTIONS.map((x) => (
        <Link key={x.href} href={x.href} className={st.menuLink} aria-current={pathname === x.href ? "page" : undefined}>
          {x.label}
        </Link>
      ))}
    </nav>
  );
}
