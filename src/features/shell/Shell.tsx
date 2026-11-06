"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiGet } from "@/core/api";
import { DashboardIcon, ExperimentsIcon, SignOutIcon, StatusIcon } from "@/core/ui/icons";
import { USING_SAMPLE_DATA } from "@/data/LedgerProvider";
import { LedgerMark } from "./LedgerMark";
import s from "./shell.module.css";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/experiments", label: "Experiments", Icon: ExperimentsIcon },
  { href: "/status", label: "Server status", Icon: StatusIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className={s.frame}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <header className={s.bar}>
        <div className={s.barInner}>
          <Link href="/dashboard" className={s.wordmark}>
            <LedgerMark size={30} />
            <span className={s.wordmarkText}>Alpha Ledger</span>
          </Link>

          <nav aria-label="Main" className={s.nav}>
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={s.navLink} aria-label={label} aria-current={isCurrent(href) ? "page" : undefined}>
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
            <span className={s.user}>
              <span className={s.avatar} aria-hidden="true">
                L
              </span>
              <span className={s.userName}>Luv</span>
            </span>
            <Link href="/login" className={s.signOut} aria-label="Sign out" title="Sign out">
              <SignOutIcon />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className={s.main}>
        {children}
      </main>
    </div>
  );
}

// A small live light: is the FastAPI server answering?
function ServerDot() {
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      apiGet<{ status: string } | null>("/health")
        .then((r) => alive && setUp(r?.status === "ok"))
        .catch(() => alive && setUp(false));
    void check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const text = up === null ? "Checking server" : up ? "Server online" : "Server offline";
  return (
    <Link href="/status" className={s.server} data-state={up === null ? "checking" : up ? "up" : "down"}>
      <span className={s.serverDot} aria-hidden="true" />
      <span className={s.serverText}>{text}</span>
    </Link>
  );
}
