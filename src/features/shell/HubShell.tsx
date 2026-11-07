"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { ExperimentsIcon, StatusIcon } from "@/core/ui/icons";
import { USING_SAMPLE_DATA } from "@/data/LedgerProvider";
import { ServerDot } from "./ServerDot";
import { UserChip } from "./UserChip";
import s from "./shell.module.css";

// Frame for pages outside any one experiment: the experiments list and server status.
export function HubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { href: "/experiments", label: "Experiments", Icon: ExperimentsIcon },
    { href: "/status", label: "Server status", Icon: StatusIcon },
  ];

  return (
    <div className={s.hub}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <header className={s.bar}>
        <div className={s.barInner}>
          <Link href="/experiments" className={s.wordmark}>
            <LedgerMark size={30} />
            <span className={s.wordmarkText}>Alpha Ledger</span>
          </Link>
          <nav aria-label="Main" className={s.nav}>
            {nav.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={s.navLink} aria-label={label} aria-current={pathname === href ? "page" : undefined}>
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className={s.right}>
            {USING_SAMPLE_DATA && (
              <span className={s.sample} title="Experiments and versions are examples until the server saves real ones. Changes reset when you reload.">
                Sample data
              </span>
            )}
            <ServerDot />
            <UserChip />
          </div>
        </div>
      </header>
      <main id="main" className={s.hubMain}>
        {children}
      </main>
    </div>
  );
}
