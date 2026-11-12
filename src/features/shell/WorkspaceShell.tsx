"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { SectionMeta } from "@/core/sections";
import { identClass } from "@/core/ui";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { BackIcon, DashboardIcon, DriveIcon, MenuIcon, SectionIcon, StatusIcon, ToolsIcon } from "@/core/ui/icons";
import { useTheme } from "@/core/theme";
import { CONNECTED_TO_SERVER, useLedger } from "@/data/LedgerProvider";
import { sectionStates, useMarks } from "@/data/marks";
import { datasetsFor } from "@/data/queries";
import { ServerDot, ServerLight } from "./ServerDot";
import { ThemeToggle } from "./ThemeToggle";
import { ToolsButton } from "./ToolsButton";
import { UserChip } from "./UserChip";
import s from "./shell.module.css";
import w from "./workspace.module.css";

// Frame for one experiment: a left sidebar with the dashboard and every section, content on the right.
export function WorkspaceShell({ experiment, sections, children }: { experiment: string; sections: SectionMeta[]; children: ReactNode }) {
  const pathname = usePathname();
  const { datasets } = useLedger();
  const { marks } = useMarks();
  const states = sectionStates(sections, marks);
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const base = `/experiments/${experiment}`;

  useEffect(() => setOpen(false), [pathname]);

  const current = sections.find((sec) => pathname.startsWith(`${base}/${sec.folder}`));
  const onTools = pathname === `${base}/tools`;

  return (
    <div className={w.frame} data-theme={theme}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>

      <aside className={w.sidebar} data-open={open} aria-label="Experiment navigation">
        <div className={w.brandRow}>
          <Link href="/experiments" className={s.wordmark}>
            <LedgerMark size={28} />
            <span className={s.wordmarkText}>Alpha Ledger</span>
          </Link>
        </div>

        <div className={w.expBlock}>
          <Link href="/experiments" className={w.back}>
            <BackIcon />
            All experiments
          </Link>
          <p className={w.expLabel}>Experiment</p>
          <p className={`${w.expName} ${identClass}`} title={experiment}>
            {experiment}
          </p>
        </div>

        <nav className={w.nav}>
          <ul className={w.list}>
            <li>
              <Link href={base} className={w.item} aria-current={pathname === base ? "page" : undefined}>
                <DashboardIcon />
                <span className={w.itemText}>Dashboard</span>
              </Link>
            </li>
          </ul>

          <p className={w.group}>Pipeline</p>
          <ul className={w.list}>
            {sections.map((sec) => {
              const href = `${base}/${sec.folder}`;
              const count = datasetsFor(datasets, experiment, sec.folder).reduce((n, d) => n + d.versions.length, 0);
              return (
                <li key={sec.folder}>
                  <Link href={href} className={w.item} data-skipped={!sec.active} data-state={states[sec.folder]} aria-current={current?.folder === sec.folder ? "page" : undefined}>
                    <SectionIcon name={sec.icon} />
                    <span className={w.itemText}>
                      <span className={w.itemNum}>{sec.number}</span> {sec.title}
                    </span>
                    {!sec.active ? (
                      <span className={w.badgeMuted}>Skipped</span>
                    ) : count > 0 ? (
                      <span className={w.badge} title={`${count} versions saved`}>
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className={w.list}>
            <li>
              <Link href={`${base}/tools`} className={w.item} aria-current={onTools ? "page" : undefined}>
                <ToolsIcon />
                <span className={w.itemText}>Tools</span>
              </Link>
            </li>
            <li>
              <Link href="/drive" className={w.item}>
                <DriveIcon />
                <span className={w.itemText}>Drive</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className={w.bottom}>
          <ul className={w.list}>
            <li>
              <Link href="/status" className={w.item}>
                <StatusIcon />
                <span className={w.itemText}>Server status</span>
                <ServerLight />
              </Link>
            </li>
          </ul>
          {!CONNECTED_TO_SERVER && (
            <div className={w.promo}>
              <strong>Not saved yet</strong>
              <p>The app isn&apos;t connected to the server yet, so anything created here disappears when you reload.</p>
            </div>
          )}
        </div>
      </aside>
      {open && <button type="button" className={w.scrim} aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className={w.content}>
        <header className={w.top}>
          <button type="button" className={w.menuBtn} aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <MenuIcon />
          </button>
          <nav aria-label="Breadcrumb" className={w.crumbs}>
            <Link href="/experiments">Experiments</Link>
            <span aria-hidden="true">/</span>
            {current || onTools ? (
              <>
                <Link href={base} className={identClass}>
                  {experiment}
                </Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{current ? `${current.number} ${current.title}` : "Tools"}</span>
              </>
            ) : (
              <span aria-current="page" className={identClass}>
                {experiment}
              </span>
            )}
          </nav>
          <div className={w.topRight}>
            <ToolsButton href={`${base}/tools`} />
            <ThemeToggle />
            <ServerDot />
            <UserChip />
          </div>
        </header>
        <main id="main" className={w.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
