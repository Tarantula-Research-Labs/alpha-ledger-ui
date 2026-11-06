"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { USING_SAMPLE_DATA, useLedger } from "@/data/LedgerProvider";
import { LedgerMark } from "./LedgerMark";
import s from "./shell.module.css";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { experiments } = useLedger();
  const sorted = [...experiments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={s.frame}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <aside className={s.sidebar}>
        <Link href="/experiments" className={s.wordmark}>
          <LedgerMark size={26} />
          <span>Alpha Ledger</span>
        </Link>

        <nav aria-label="Main" className={s.nav}>
          <Link href="/experiments" className={s.navLink} aria-current={pathname === "/experiments" ? "page" : undefined}>
            Experiments
          </Link>
          <ul className={s.expList}>
            {sorted.map((e) => {
              const href = `/experiments/${e.name}`;
              return (
                <li key={e.name}>
                  <Link href={href} className={s.expLink} aria-current={isCurrent(href) ? "page" : undefined}>
                    {e.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/status" className={s.navLink} aria-current={pathname === "/status" ? "page" : undefined}>
            Server status
          </Link>
        </nav>

        <div className={s.foot}>
          {USING_SAMPLE_DATA && (
            <p className={s.sample}>
              <strong>Sample data.</strong> Experiments and versions here are examples until the server saves real ones.
              Changes reset when you reload.
            </p>
          )}
          <Link href="/login" className={s.signOut}>
            Sign out
          </Link>
        </div>
      </aside>

      <main id="main" className={s.main}>
        {children}
      </main>
    </div>
  );
}
