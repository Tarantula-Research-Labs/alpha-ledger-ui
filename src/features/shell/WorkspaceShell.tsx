"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { SectionMeta } from "@/core/sections";
import { identClass } from "@/core/ui";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { BackIcon, DashboardIcon, MenuIcon, SectionIcon, StatusIcon } from "@/core/ui/icons";
import { USING_SAMPLE_DATA, useLedger } from "@/data/LedgerProvider";
import { datasetsFor } from "@/data/queries";
import { ServerDot } from "./ServerDot";
import { UserChip } from "./UserChip";
import s from "./shell.module.css";
import w from "./workspace.module.css";

// Frame for one experiment: a left sidebar with the dashboard and every section, content on the right.
export function WorkspaceShell({ experiment, sections, children }: { experiment: string; sections: SectionMeta[]; children: ReactNode }) {
  const pathname = usePathname();
  const { datasets } = useLedger();
  const [open, setOpen] = useState(false);
  const base = `/experiments/${experiment}`;

  useEffect(() => setOpen(false), [pathname]);

  const current = sections.find((sec) => pathname.startsWith(`${base}/${sec.folder}`));

  return (
    <div className={w.frame}>
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
                  <Link href={href} className={w.item} data-skipped={!sec.active} aria-current={current?.folder === sec.folder ? "page" : undefined}>
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
        </nav>

        <div className={w.bottom}>
          <ul className={w.list}>
            <li>
              <Link href="/status" className={w.item}>
                <StatusIcon />
                <span className={w.itemText}>Server status</span>
              </Link>
            </li>
          </ul>
          {USING_SAMPLE_DATA && (
            <div className={w.promo}>
              <strong>Showing sample data</strong>
              <p>Experiments and versions here are examples until the server saves real ones. Changes reset when you reload.</p>
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
            {current ? (
              <>
                <Link href={base} className={identClass}>
                  {experiment}
                </Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">
                  {current.number} {current.title}
                </span>
              </>
            ) : (
              <span aria-current="page" className={identClass}>
                {experiment}
              </span>
            )}
          </nav>
          <div className={w.topRight}>
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
