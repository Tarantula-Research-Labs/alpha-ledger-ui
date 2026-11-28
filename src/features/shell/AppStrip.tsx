"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DriveIcon, ExperimentsIcon, RecordsIcon, StudyIcon } from "@/core/ui/icons";
import s from "./shell.module.css";

// Pages in the strip. To add one: one line here (plus its page under app/(hub)).
const NAV = [
  { href: "/experiments", label: "Experiments", Icon: ExperimentsIcon },
  { href: "/drive", label: "Drive", Icon: DriveIcon },
  { href: "/records", label: "Research records", Icon: RecordsIcon },
  { href: "/study", label: "Study", Icon: StudyIcon },
];

// The pages, as a slim icon strip under the header with tooltips (a bottom bar on phones).
export function AppStrip() {
  const pathname = usePathname();
  return (
    <nav className={s.strip} aria-label="Main">
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={s.stripLink} aria-label={label} aria-current={pathname.startsWith(href) ? "page" : undefined}>
          <Icon />
          <span className={s.tip} aria-hidden="true">
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
