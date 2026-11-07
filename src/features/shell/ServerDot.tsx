"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/core/api";
import s from "./shell.module.css";

/** Is the FastAPI server answering? null while checking. Re-checks every 30 seconds. */
export function useServerUp(): boolean | null {
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
  return up;
}

const stateOf = (up: boolean | null) => (up === null ? "checking" : up ? "up" : "down");
const textOf = (up: boolean | null) => (up === null ? "Checking server" : up ? "Server online" : "Server offline");

// The live server light with its words, linking to the status page.
export function ServerDot() {
  const up = useServerUp();
  return (
    <Link href="/status" className={s.server} data-state={stateOf(up)} title={textOf(up)}>
      <span className={s.serverDot} aria-hidden="true" />
      <span className={s.serverText}>{textOf(up)}</span>
    </Link>
  );
}

// Just the light, for places that already say "Server status".
export function ServerLight() {
  const up = useServerUp();
  return (
    <span className={`${s.server} ${s.serverLight}`} data-state={stateOf(up)}>
      <span className={s.serverDot} aria-hidden="true" />
      <span className="sr-only">{textOf(up)}</span>
    </span>
  );
}
