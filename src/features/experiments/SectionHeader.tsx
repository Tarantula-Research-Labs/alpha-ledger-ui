import Link from "next/link";
import type { SectionMeta } from "@/core/sections";
import { Breadcrumbs } from "@/core/ui";
import x from "./experiments.module.css";

// Top of every section page: where you are, what this section holds, and the neighbouring sections.
export function SectionHeader({ experiment, section, sections }: { experiment: string; section: SectionMeta; sections: SectionMeta[] }) {
  const i = sections.findIndex((s) => s.folder === section.folder);
  const prev = sections[i - 1];
  const next = sections[i + 1];
  const href = (s: SectionMeta) => `/experiments/${experiment}/${s.folder}`;

  return (
    <header className={x.sectionHead}>
      <Breadcrumbs
        items={[
          { label: "Experiments", href: "/experiments" },
          { label: experiment, href: `/experiments/${experiment}` },
          { label: `${section.number} ${section.title}` },
        ]}
      />
      <div className={x.sectionTitleRow}>
        <span className={x.sectionNum} aria-hidden="true">
          {section.number}
        </span>
        <div>
          <h1 className={x.sectionTitle}>
            <span className="sr-only">{section.number} </span>
            {section.title}
          </h1>
          <p className={x.lead}>{section.blurb}</p>
        </div>
      </div>
      <nav className={x.sectionNav} aria-label="Neighbouring sections">
        {prev ? (
          <Link href={href(prev)}>
            Previous: {prev.number} {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={href(next)}>
            Next: {next.number} {next.title}
          </Link>
        )}
      </nav>
    </header>
  );
}
