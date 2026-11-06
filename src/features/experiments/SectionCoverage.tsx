import type { SectionMeta } from "@/core/sections";
import x from "./experiments.module.css";

// One cell per section, in pipeline order: filled when something is saved there, hatched when skipped.
export function SectionCoverage({ sections, filled }: { sections: SectionMeta[]; filled: Set<string> }) {
  const active = sections.filter((s) => s.active);
  const count = active.filter((s) => filled.has(s.folder)).length;
  return (
    <span className={x.coverage}>
      <span className="sr-only">
        Saves in {count} of {active.length} active sections
      </span>
      {sections.map((s) => {
        const state = !s.active ? "skipped" : filled.has(s.folder) ? "filled" : "empty";
        const what = state === "skipped" ? "skipped for now" : state === "filled" ? "has saves" : "nothing saved";
        return (
          <span key={s.folder} className={x.cell} data-state={state} title={`${s.number} ${s.title}: ${what}`} aria-hidden="true">
            {s.number}
          </span>
        );
      })}
    </span>
  );
}
