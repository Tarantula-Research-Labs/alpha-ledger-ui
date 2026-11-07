"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Dialog, Field, Tabs, inputClass } from "@/core/ui";
import { LedgerMark } from "@/core/ui/LedgerMark";
import a from "./auth.module.css";

export type AuthMode = "login" | "signup";

// Log in / Sign up popup. Accounts will be handled by Clerk; until it is connected, any details open the app.
export function AuthModal({ open, mode, onMode, onClose }: { open: boolean; mode: AuthMode; onMode: (m: AuthMode) => void; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    router.push("/experiments");
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className={a.title}>
          <LedgerMark size={26} />
          {mode === "login" ? "Welcome back" : "Create your account"}
        </span>
      }
    >
      <div className={a.tabs}>
        <Tabs
          tabs={[
            { id: "login", label: "Log in" },
            { id: "signup", label: "Sign up" },
          ]}
          active={mode}
          onChange={onMode}
          label="Log in or sign up"
        />
      </div>

      <form onSubmit={submit} className={a.form}>
        {mode === "signup" && (
          <Field label="Name" id="auth-name">
            <input id="auth-name" className={inputClass} autoComplete="name" />
          </Field>
        )}
        <Field label="Email" id="auth-email">
          <input id="auth-email" type="email" className={inputClass} autoComplete="email" />
        </Field>
        <Field label="Password" id="auth-password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <input id="auth-password" type="password" className={inputClass} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>

        <Button type="submit" variant="primary" className={a.submit} disabled={busy}>
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>

      <p className={a.switch}>
        {mode === "login" ? (
          <>
            New to Alpha Ledger?{" "}
            <button type="button" onClick={() => onMode("signup")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => onMode("login")}>
              Log in
            </button>
          </>
        )}
      </p>
      <p className={a.note}>Accounts aren&apos;t connected yet (they&apos;ll use Clerk), so any details open the app for now.</p>
    </Dialog>
  );
}
