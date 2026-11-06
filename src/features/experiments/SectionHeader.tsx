import type { SectionMeta } from "@/core/sections";
import { PageHeader } from "@/core/ui";

// Top of every section page: back to the experiment, the section's name and job, and its neighbours.
export function SectionHeader({ experiment, section, sections }: { experiment: string; section: SectionMeta; sections: SectionMeta[] }) {
  const i = sections.findIndex((s) => s.folder === section.folder);
  const prev = sections[i - 1];
  const next = sections[i + 1];
  const href = (s: SectionMeta) => `/experiments/${experiment}/${s.folder}`;

  const links = [
    ...(prev ? [{ href: href(prev), label: `‹ ${prev.number} ${prev.title}` }] : []),
    ...(next ? [{ href: href(next), label: `${next.number} ${next.title} ›` }] : []),
  ];

  return (
    <PageHeader
      back={{ href: `/experiments/${experiment}`, label: `Back to ${experiment}` }}
      title={
        <>
          <span style={{ color: "var(--label)", marginRight: 10 }}>{section.number}</span>
          {section.title}
          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "var(--fs-sm)", marginLeft: 12 }}>{experiment}</span>
        </>
      }
      sub={section.blurb}
      links={links}
    />
  );
}
