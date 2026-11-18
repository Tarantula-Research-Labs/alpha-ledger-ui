"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { ServerDot } from "./ServerDot";
import { ThemeToggle } from "./ThemeToggle";
import { UserChip } from "./UserChip";
import s from "./shell.module.css";

// The header on every page: the Alpha Ledger logo, an optional middle (e.g. an experiment's breadcrumb),
// then theme, the server light (opens Server status) and the account.
export function AppHeader({ before, middle, extra }: { before?: ReactNode; middle?: ReactNode; extra?: ReactNode }) {
  return (
    <header className={s.appBar}>
      {before}
      <Link href="/experiments" className={s.wordmark}>
        <LedgerMark size={30} />
        <span className={s.wordmarkText}>Alpha Ledger</span>
      </Link>
      <div className={s.appBarMid}>{middle}</div>
      <div className={s.appBarRight}>
        {extra}
        <ThemeToggle />
        <ServerDot />
        <UserChip />
      </div>
    </header>
  );
}
