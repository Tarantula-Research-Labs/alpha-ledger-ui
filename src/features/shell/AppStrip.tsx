"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { DriveIcon, ExperimentsIcon, RecordsIcon, StatusIcon } from "@/core/ui/icons";
import { useServerUp } from "./ServerDot";
import { ThemeToggle } from "./ThemeToggle";
import { UserChip } from "./UserChip";
import s from "./shell.module.css";

// Pages in the strip. To add one: one line here (plus its page under app/(hub)).
const NAV = [
  { href: "/experiments", label: "Experiments", Icon: ExperimentsIcon },
  { href: "/drive", label: "Drive", Icon: DriveIcon },
  { href: "/records", label: "Research records", Icon: RecordsIcon },
];

function StripLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={s.stripLink} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
      <span className={s.tip} aria-hidden="true">
        {label}
      </span>
    </Link>
  );
}

// The app's main navigation on every page: a slim icon strip on the left with tooltips
// (a bottom bar on phones). Server status shows the live light; theme and account sit at the bottom.
export function AppStrip() {
  const pathname = usePathname();
  const up = useServerUp();
  const serverLabel = up === null ? "Server status · checking" : up ? "Server status · online" : "Server status · offline";
  return (
    <nav className={s.strip} aria-label="Main">
      <Link href="/experiments" className={s.stripLogo} aria-label="Alpha Ledger, experiments">
        <LedgerMark size={30} />
      </Link>
      {NAV.map(({ href, label, Icon }) => (
        <StripLink key={href} href={href} label={label} active={pathname.startsWith(href)}>
          <Icon />
        </StripLink>
      ))}
      <span className={s.stripSep} aria-hidden="true" />
      <StripLink href="/status" label={serverLabel} active={pathname.startsWith("/status")}>
        <StatusIcon />
        <span className={s.stripDot} data-state={up === null ? "checking" : up ? "up" : "down"} aria-hidden="true" />
      </StripLink>
      <span className={s.stripFill} />
      <div className={s.stripTools}>
        <ThemeToggle />
        <UserChip />
      </div>
    </nav>
  );
}
