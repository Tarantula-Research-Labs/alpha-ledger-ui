"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { DriveIcon, ExperimentsIcon, StatusIcon } from "@/core/ui/icons";
import { useTheme } from "@/core/theme";
import { CONNECTED_TO_SERVER } from "@/data/LedgerProvider";
import { ServerDot } from "./ServerDot";
import { ThemeToggle } from "./ThemeToggle";
import { UserChip } from "./UserChip";
import s from "./shell.module.css";

// Frame for pages outside any one experiment: the experiments list, the Drive and server status.
export function HubShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const nav = [
    { href: "/experiments", label: "Experiments", Icon: ExperimentsIcon },
    { href: "/drive", label: "Drive", Icon: DriveIcon },
    { href: "/status", label: "Server status", Icon: StatusIcon },
  ];

  return (
    <div className={s.hub} data-theme={theme}>
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
            {!CONNECTED_TO_SERVER && (
              <span className={s.notSaved} title="Experiments you create here stay in this browser tab only and disappear when you reload, until the app is connected to the server.">
                Not saved yet
              </span>
            )}
            <ThemeToggle />
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
