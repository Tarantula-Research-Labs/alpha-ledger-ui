"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { VersionStatus } from "../types";
import s from "./ui.module.css";

/* ---------- Button ---------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "default" | "quiet";
};

export function Button({ variant = "default", className, ...rest }: ButtonProps) {
  const v = variant === "primary" ? s.primary : variant === "quiet" ? s.quiet : "";
  return <button type="button" className={[s.button, v, className].filter(Boolean).join(" ")} {...rest} />;
}

export function ButtonLink({ href, children, variant = "default" }: { href: string; children: ReactNode; variant?: "primary" | "default" }) {
  return (
    <Link href={href} className={[s.button, variant === "primary" ? s.primary : ""].join(" ")}>
      {children}
    </Link>
  );
}

/* ---------- Dialog and drawer ---------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = "dialog",
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  variant?: "dialog" | "drawer";
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start focus at the top of the dialog instead of on the close button.
      d.querySelector<HTMLElement>("[data-dialog-start]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const cls = [s.dialog, variant === "drawer" ? s.drawer : "", wide ? s.wide : ""].join(" ");
  return (
    <dialog
      ref={ref}
      className={cls}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      {open && (
        <div className={s.dialogInner} tabIndex={-1} data-dialog-start>
          <div className={s.dialogHead}>
            <h2 className={s.dialogTitle}>{title}</h2>
            <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/* ---------- Code block with copy ---------- */

export function CodeBlock({ code, label = "Python" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className={s.code}>
      <div className={s.codeBar}>
        <span>{label}</span>
        <Button variant="quiet" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ---------- Status ---------- */

const STATUS_TEXT: Record<VersionStatus, string> = {
  complete: "Complete",
  pending: "Pending",
  failed: "Failed",
};

export function StatusMark({ status }: { status: VersionStatus }) {
  return <span className={`${s.status} ${s[status]}`}>{STATUS_TEXT[status]}</span>;
}

/* ---------- Version ticks ---------- */

export function VersionTicks({ versions }: { versions: { version: number; status: VersionStatus }[] }) {
  const latestComplete = [...versions].reverse().find((v) => v.status === "complete")?.version;
  return (
    <span className={s.ticks} role="img" aria-label={`${versions.length} versions${latestComplete ? `, latest v${latestComplete}` : ""}`}>
      {versions.map((v) => (
        <span
          key={v.version}
          className={[s.tick, v.version === latestComplete ? s.tickLatest : "", v.status === "failed" ? s.tickFailed : ""].join(" ")}
        />
      ))}
    </span>
  );
}

/* ---------- Breadcrumbs ---------- */

export function Breadcrumbs({ items }: { items: { label: ReactNode; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className={s.crumbs}>
      <ol>
        {items.map((item, i) => (
          <li key={i}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- Form field ---------- */

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {children}
      {error ? (
        <p className={s.error} id={`${id}-msg`}>
          {error}
        </p>
      ) : hint ? (
        <p className={s.hint} id={`${id}-msg`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = s.input;
export const identClass = s.ident;

/* ---------- Empty state ---------- */

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <strong>{title}</strong>
      {children}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}
