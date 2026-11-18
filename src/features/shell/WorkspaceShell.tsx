"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { SectionMeta } from "@/core/sections";
import { identClass } from "@/core/ui";
import { DashboardIcon, MenuIcon, SectionIcon, ToolsIcon } from "@/core/ui/icons";
import { useTheme } from "@/core/theme";
import { CONNECTED_TO_SERVER, useLedger } from "@/data/LedgerProvider";
import { sectionStates, useMarks } from "@/data/marks";
import { datasetsFor } from "@/data/queries";
import { AppHeader } from "./AppHeader";
import { AppStrip } from "./AppStrip";
import { ToolsButton } from "./ToolsButton";
import s from "./shell.module.css";
import w from "./workspace.module.css";

// Frame for one experiment: the shared header (with this experiment's breadcrumb and Tools), then the
// page strip, a sidebar with the dashboard and every section, and the content.
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

      <AppHeader
        before={
          <button type="button" className={w.menuBtn} aria-label="Open sections" aria-expanded={open} onClick={() => setOpen(true)}>
            <MenuIcon />
          </button>
        }
        middle={
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
        }
        extra={<ToolsButton href={`${base}/tools`} />}
      />
      <div className={w.cols}>
      <AppStrip />

      <aside className={w.sidebar} data-open={open} aria-label="Experiment navigation">
        <div className={w.expBlock}>
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
          </ul>
        </nav>

        {!CONNECTED_TO_SERVER && (
          <div className={w.bottom}>
            <div className={w.promo}>
              <strong>Not saved yet</strong>
              <p>The app isn&apos;t connected to the server yet, so anything created here disappears when you reload.</p>
            </div>
          </div>
        )}
      </aside>
      {open && <button type="button" className={w.scrim} aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className={w.content}>
        <main id="main" className={w.main}>
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}
