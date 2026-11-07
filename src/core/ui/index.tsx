"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
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

/* ---------- Panel (card) ---------- */

export function Panel({
  title,
  actions,
  children,
  flush = false,
  icon = false,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  icon?: boolean;
}) {
  return (
    <section className={s.panel}>
      {(title || actions) && (
        <header className={s.panelHead}>
          {title ? (
            <h2 className={s.panelTitle}>
              {icon && <span className={s.panelIcon} aria-hidden="true" />}
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions && <div className={s.panelActions}>{actions}</div>}
        </header>
      )}
      <div className={flush ? s.panelFlush : s.panelBody}>{children}</div>
    </section>
  );
}

/* ---------- Tabs ---------- */

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={s.tabs}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === active} className={s.tab} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Stat tiles: two label/value pairs per tile ---------- */

export type Stat = { label: string; value: ReactNode; tone?: "up" | "down" | "warn" };

export function StatTiles({ rows }: { rows: [Stat, Stat?][] }) {
  return (
    <div className={s.stats}>
      {rows.map((pair, i) => (
        <dl key={i} className={s.stat}>
          {pair.map((st, j) =>
            st ? (
              <div key={j}>
                <dt className={s.statLabel}>{st.label}</dt>
                <dd className={[s.statValue, st.tone ? s[st.tone] : ""].join(" ")} style={{ margin: 0 }}>
                  {st.value}
                </dd>
              </div>
            ) : (
              <div key={j} />
            ),
          )}
        </dl>
      ))}
    </div>
  );
}

/* ---------- KPI card: one big number with a label and a note ---------- */

export function KpiCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  tone?: "up" | "down" | "warn";
}) {
  return (
    <div className={s.kpi}>
      <div className={s.kpiHead}>
        <span className={s.kpiLabel}>{label}</span>
        {icon && <span className={s.kpiIcon}>{icon}</span>}
      </div>
      <div className={[s.kpiValue, tone ? s[tone] : ""].join(" ")}>{value}</div>
      {note && <div className={s.kpiNote}>{note}</div>}
    </div>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className={s.kpiRow}>{children}</div>;
}

/* ---------- Page header ---------- */

export function PageHeader({
  title,
  back,
  sub,
  links,
  actions,
  ident = false,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  sub?: ReactNode;
  links?: { href: string; label: string }[];
  actions?: ReactNode;
  ident?: boolean;
}) {
  return (
    <header className={s.pageHead}>
      <div>
        <div className={s.pageTitleRow}>
          {back && (
            <Link href={back.href} className={s.back} aria-label={back.label}>
              ‹
            </Link>
          )}
          <h1 className={[s.pageTitle, ident ? s.ident : ""].join(" ")}>{title}</h1>
        </div>
        {sub && <p className={s.pageSub} style={back ? { marginLeft: 40 } : undefined}>{sub}</p>}
      </div>
      {(links || actions) && (
        <div className={s.pageLinks}>
          {links?.map((l) => (
            <Link key={l.href} href={l.href} className={s.pageLink}>
              {l.label}
            </Link>
          ))}
          {actions}
        </div>
      )}
    </header>
  );
}

/* ---------- Layout ---------- */

export function TwoColumn({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className={s.twoCol}>
      <div style={{ display: "grid", gap: 20, minWidth: 0 }}>{main}</div>
      <aside style={{ display: "grid", gap: 20, minWidth: 0 }}>{aside}</aside>
    </div>
  );
}

export function CardRow({ children }: { children: ReactNode }) {
  return <div className={s.cardRow}>{children}</div>;
}

/* ---------- Bar chart (SVG, no library) ---------- */

export function BarChart({
  data,
  format = (v) => String(v),
  label,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  format?: (v: number) => string;
  label: string;
}) {
  const gid = useId().replace(/:/g, "");
  const W = 640;
  const H = 260;
  const top = 30;
  const bottom = 40;
  const max = Math.max(0, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const y = (v: number) => top + ((max - v) / span) * (H - top - bottom);
  const slot = W / Math.max(data.length, 1);
  const bw = Math.min(56, slot * 0.46);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.chart} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7aa2ff" />
          <stop offset="100%" stopColor="#2a4fc9" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`h${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9c3ff" />
          <stop offset="100%" stopColor="#3b6cf6" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} className={s.chartAxis} />
      {data.map((d, i) => {
        const cx = slot * i + slot / 2;
        const y0 = y(0);
        const y1 = y(d.value);
        const h = Math.max(2, Math.abs(y1 - y0));
        const yTop = Math.min(y0, y1);
        return (
          <g key={d.label}>
            <rect
              x={cx - bw / 2}
              y={yTop}
              width={bw}
              height={h}
              rx="3"
              fill={`url(#${d.highlight ? "h" : "b"}${gid})`}
              style={d.highlight ? { filter: "drop-shadow(0 0 10px rgba(91,139,255,0.7))" } : undefined}
            />
            <text x={cx} y={d.value >= 0 ? yTop - 8 : yTop + h + 16} textAnchor="middle" className={s.chartValue} fill={d.value >= 0 ? "#2fd27a" : "#f0505a"}>
              {format(d.value)}
            </text>
            <text x={cx} y={H - 14} textAnchor="middle" className={s.chartLabel}>
              {d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
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
