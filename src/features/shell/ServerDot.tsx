"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/core/api";
import s from "./shell.module.css";

// A small live light: is the FastAPI server answering?
export function ServerDot({ showText = true }: { showText?: boolean }) {
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
    <Link href="/status" className={s.server} data-state={up === null ? "checking" : up ? "up" : "down"} title={text}>
      <span className={s.serverDot} aria-hidden="true" />
      <span className={showText ? s.serverText : "sr-only"}>{text}</span>
    </Link>
  );
}
