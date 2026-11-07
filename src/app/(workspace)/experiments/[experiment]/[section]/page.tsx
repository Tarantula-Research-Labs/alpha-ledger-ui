import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SectionHeader } from "@/features/experiments/SectionHeader";
import { SECTION_META, findSection } from "@/sections/registry";

type Props = { params: Promise<{ experiment: string; section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { experiment, section } = await params;
  const def = findSection(section);
  return { title: def ? `${def.number} ${def.title}, ${experiment}` : experiment };
}

export default async function SectionPage({ params }: Props) {
  const { experiment, section } = await params;
  const def = findSection(section);
  if (!def) notFound();
  const { Panel } = def;
  const meta = SECTION_META.find((s) => s.folder === def.folder)!;

  return (
    <>
      <SectionHeader experiment={experiment} section={meta} sections={SECTION_META} />
      <Suspense>
        <Panel experiment={experiment} />
      </Suspense>
    </>
  );
}
