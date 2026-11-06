"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, inputClass } from "@/core/ui";
import { LedgerMark } from "@/features/shell/LedgerMark";
import s from "./login.module.css";

// Sign-in isn't connected to the server yet (login method is still an open decision).
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className={s.page}>
      <form className={s.panel} onSubmit={submit}>
        <div className={s.brand}>
          <LedgerMark size={34} />
          <h1>Alpha Ledger</h1>
        </div>
        <p className={s.lead}>Every version of your research, and what it was built from.</p>

        <Field label="Email" id="email">
          <input id="email" type="email" className={inputClass} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" id="password">
          <input id="password" type="password" className={inputClass} autoComplete="current-password" />
        </Field>

        <Button type="submit" variant="primary" className={s.submit}>
          Sign in
        </Button>
        <p className={s.note}>Sign-in isn&apos;t connected yet, so any details open the app.</p>
      </form>
    </div>
  );
}
