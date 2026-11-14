"use client";

// Plain SVG charts for the results dashboard (no chart library). Hover a mark for its value.
import type { ReactNode } from "react";
import { isNum, quantile, tCI, median } from "./stats";
import c from "./results.module.css";

const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

function ticks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo || 1;
  const step0 = Math.pow(10, Math.floor(Math.log10(span / n)));
  const err = span / n / step0;
  const step = step0 * (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(+v.toFixed(10));
  return out;
}

function extent(values: number[], include: number[] = [], pad = 0.06): [number, number] {
  const all = [...values.filter(isNum), ...include];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (!Number.isFinite(lo)) return [0, 1];
  const p = (hi - lo || Math.abs(hi) || 1) * pad;
  lo -= p;
  hi += p;
  return [lo, hi];
}

export const pct = (x: number | null | undefined, d = 1) => (isNum(x) ? `${(x * 100).toFixed(d)}%` : "–");
export const f2 = (x: number | null | undefined) => (isNum(x) ? x.toFixed(2) : "–");
export const f3 = (x: number | null | undefined) => (isNum(x) ? x.toFixed(3) : "–");

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className={c.legend}>
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color, opacity: i.dashed ? 0.7 : 1 }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Equity lines with a drawdown panel underneath. */
export function EquityChart({
  dates,
  series,
  drawdowns,
  height = 300,
}: {
  dates: string[];
  series: { name: string; values: number[]; color: string; dashed?: boolean }[];
  drawdowns: { name: string; values: number[]; color: string; dashed?: boolean }[];
  height?: number;
}) {
  const w = 1000;
  const L = 48;
  const R = 10;
  const top = height * 0.68;
  const n = dates.length;
  const X = scale(0, Math.max(1, n - 1), L, w - R);
  const [lo, hi] = extent(series.flatMap((s) => s.values));
  const Y = scale(lo, hi, top - 22, 8);
  const ddLo = Math.min(...drawdowns.flatMap((d) => d.values), -0.01);
  const Yd = scale(ddLo, 0, height - 4, top + 8);
  const line = (vals: number[], y: (v: number) => number) => vals.map((v, i) => `${X(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const step = Math.max(1, Math.floor(n / 200));
  let lastLabel = "";
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Equity and drawdown">
      {ticks(lo, hi, 4).map((t) => (
        <g key={t}>
          <line className={c.grid} x1={L} x2={w - R} y1={Y(t)} y2={Y(t)} />
          <text x={L - 6} y={Y(t) + 4} textAnchor="end">
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      {dates.map((d, i) => {
        const label = n > 400 ? d.slice(0, 4) : d.slice(0, 7);
        if (label === lastLabel || (n <= 400 && !["01", "04", "07", "10"].includes(d.slice(5, 7)))) return null;
        lastLabel = label;
        return (
          <text key={d} x={X(i)} y={top - 6} textAnchor="middle">
            {label}
          </text>
        );
      })}
      <text x={L - 6} y={top + 14} textAnchor="end">
        0%
      </text>
      <text x={L - 6} y={height - 4} textAnchor="end">
        {pct(ddLo, 0)}
      </text>
      {series.map((s) => (
        <polyline key={s.name} points={line(s.values, Y)} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.3 : 2} strokeDasharray={s.dashed ? "4 3" : undefined} />
      ))}
      <line className={c.axis} x1={L} x2={w - R} y1={top + 2} y2={top + 2} />
      <text x={w - R - 4} y={top + 18} textAnchor="end" style={{ fill: "var(--red)" }}>
        Drawdown
      </text>
      <line className={c.grid} x1={L} x2={w - R} y1={Yd(0)} y2={Yd(0)} />
      {drawdowns.map((s, k) =>
        k === 0 ? (
          <g key={s.name}>
            <polygon points={`${X(0).toFixed(1)},${Yd(0).toFixed(1)} ${line(s.values, Yd)} ${X(n - 1).toFixed(1)},${Yd(0).toFixed(1)}`} fill="var(--red)" fillOpacity={0.18} stroke="none" />
            <polyline points={line(s.values, Yd)} fill="none" stroke="var(--red)" strokeWidth={1.3} />
          </g>
        ) : (
          <polyline key={s.name} points={line(s.values, Yd)} fill="none" stroke="var(--muted)" strokeWidth={1.1} strokeDasharray="4 3" />
        ),
      )}
      {dates.map((d, i) =>
        i % step === 0 ? (
          <rect key={d} x={X(i) - ((w - L) / n) * step * 0.5} y={0} width={((w - L) / n) * step} height={height} fill="transparent">
            <title>{`${d}\n${series.map((s) => `${s.name}: ${s.values[i].toFixed(3)}`).join("\n")}\n${drawdowns.map((s) => `Drawdown ${s.name}: ${pct(s.values[i])}`).join("\n")}`}</title>
          </rect>
        ) : null,
      )}
    </svg>
  );
}

/** Two bars (strategy vs benchmark) for one metric, with values written on them. */
export function PairBars({ items, fmt }: { items: { name: string; value: number | null; color: string }[]; fmt: (x: number) => string }) {
  const w = 260;
  const h = 140;
  const vals = items.map((i) => i.value ?? 0);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const p = (hi - lo || 1) * 0.18;
  if (lo < 0) lo -= p;
  if (hi > 0) hi += p;
  const Y = scale(lo, hi, h - 8, 16);
  const bw = w / items.length;
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${h}`} role="img">
      <line className={c.axis} x1={0} x2={w} y1={Y(0)} y2={Y(0)} />
      {items.map((it, i) => {
        const v = it.value ?? 0;
        const x = bw * i + bw * 0.22;
        const y0 = Y(0);
        const y1 = Y(v);
        return (
          <g key={it.name}>
            <rect x={x} y={Math.min(y0, y1)} width={bw * 0.56} height={Math.max(1, Math.abs(y1 - y0))} rx={3} fill={it.color}>
              <title>{`${it.name}: ${isNum(it.value) ? fmt(it.value) : "–"}`}</title>
            </rect>
            <text className={c.valueText} x={x + bw * 0.28} y={v >= 0 ? y1 - 5 : y1 + 13} textAnchor="middle">
              {isNum(it.value) ? fmt(it.value) : "–"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Grouped bars per period (e.g. quarterly PnL: strategy vs benchmark). */
export function GroupBars({
  labels,
  series,
  fmt = (x) => pct(x, 0),
  height = 200,
}: {
  labels: string[];
  series: { name: string; values: number[]; color: string }[];
  fmt?: (x: number) => string;
  height?: number;
}) {
  const w = 1000;
  const L = 48;
  const B = 24;
  const [lo, hi] = extent(series.flatMap((s) => s.values), [0], 0.1);
  const Y = scale(lo, hi, height - B, 8);
  const gw = (w - L - 24) / Math.max(1, labels.length);
  const bw = (gw * 0.72) / series.length;
  const every = Math.ceil(labels.length / 16);
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${height}`} role="img">
      {ticks(lo, hi, 4).map((t) => (
        <g key={t}>
          <line className={c.grid} x1={L} x2={w - 6} y1={Y(t)} y2={Y(t)} />
          <text x={L - 6} y={Y(t) + 4} textAnchor="end">
            {fmt(t)}
          </text>
        </g>
      ))}
      <line className={c.axis} x1={L} x2={w - 6} y1={Y(0)} y2={Y(0)} />
      {labels.map((lab, g) => (
        <g key={lab}>
          {series.map((s, j) => {
            const v = s.values[g] ?? 0;
            const y0 = Y(0);
            const y1 = Y(v);
            return (
              <rect key={s.name} x={L + gw * g + gw * 0.14 + bw * j} y={Math.min(y0, y1)} width={Math.max(1, bw - 1.5)} height={Math.max(1, Math.abs(y1 - y0))} rx={1.5} fill={s.color}>
                <title>{`${s.name} · ${lab}: ${pct(v)}`}</title>
              </rect>
            );
          })}
          {g % every === 0 && (
            <text x={L + gw * g + gw / 2} y={height - 7} textAnchor="middle">
              {lab}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Horizontal mean ± 95% CI per row, with an optional reference line (e.g. base rate). */
export function CIChart({
  rows,
  reference,
  referenceLabel,
  fmt = f3,
}: {
  rows: { label: string; values: (number | null)[]; color: string; bold?: boolean }[];
  reference?: number | null;
  referenceLabel?: string;
  fmt?: (x: number) => string;
}) {
  const w = 560;
  const L = 50;
  const R = 150;
  const h = 34 * rows.length + 34;
  const cis = rows.map((r) => tCI(r.values));
  const [lo, hi] = extent(cis.flatMap((x) => [x.lo, x.hi]), isNum(reference) ? [reference] : [], 0.08);
  const X = scale(lo, hi, L, w - R);
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${h}`} role="img">
      {ticks(lo, hi).map((t) => (
        <g key={t}>
          <line className={c.grid} x1={X(t)} x2={X(t)} y1={8} y2={h - 22} />
          <text x={X(t)} y={h - 8} textAnchor="middle">
            {fmt(t)}
          </text>
        </g>
      ))}
      {isNum(reference) && (
        <g>
          <line x1={X(reference)} x2={X(reference)} y1={4} y2={h - 22} stroke="var(--amber)" strokeDasharray="4 3" />
          <text x={X(reference) + 4} y={13} style={{ fill: "var(--amber)" }}>
            {referenceLabel}
          </text>
        </g>
      )}
      {rows.map((r, i) => {
        const ci = cis[i];
        const y = 28 + i * 34;
        const ok = isNum(ci.lo) && isNum(ci.hi);
        return (
          <g key={r.label}>
            <title>{`${r.label}\nmean ${fmt(ci.m)}\n95% CI [${fmt(ci.lo)}, ${fmt(ci.hi)}]\nn = ${ci.n} folds`}</title>
            <text x={6} y={y + 4} className={r.bold ? c.boldText : undefined}>
              {r.label}
            </text>
            {ok && (
              <>
                <line x1={X(ci.lo)} x2={X(ci.hi)} y1={y} y2={y} stroke={r.color} strokeWidth={2} />
                <line x1={X(ci.lo)} x2={X(ci.lo)} y1={y - 5} y2={y + 5} stroke={r.color} strokeWidth={2} />
                <line x1={X(ci.hi)} x2={X(ci.hi)} y1={y - 5} y2={y + 5} stroke={r.color} strokeWidth={2} />
              </>
            )}
            {isNum(ci.m) && <circle cx={X(ci.m)} cy={y} r={5} fill={r.color} />}
            <text x={w - R + 12} y={y + 4}>
              {`${fmt(ci.m)} [${fmt(ci.lo)}, ${fmt(ci.hi)}]`}
            </text>
            <rect x={0} y={y - 15} width={w} height={30} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

/** Box plot per group (spread across folds) with the mean ± 95% CI drawn beside each box. */
export function BoxCI({
  groups,
  fmt = (x) => pct(x, 0),
  valueFmt = (x) => pct(x),
}: {
  groups: { label: string; values: (number | null)[]; color: string; bold?: boolean }[];
  fmt?: (x: number) => string;
  valueFmt?: (x: number) => string;
}) {
  const w = 560;
  const h = 250;
  const L = 48;
  const B = 30;
  const clean = groups.map((g) => g.values.filter(isNum));
  const [lo, hi] = extent(clean.flat(), [0]);
  const Y = scale(lo, hi, h - B, 10);
  const bw = (w - L - 8) / groups.length;
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${h}`} role="img">
      {ticks(lo, hi, 5).map((t) => (
        <g key={t}>
          <line className={c.grid} x1={L} x2={w - 6} y1={Y(t)} y2={Y(t)} />
          <text x={L - 6} y={Y(t) + 4} textAnchor="end">
            {fmt(t)}
          </text>
        </g>
      ))}
      <line x1={L} x2={w - 6} y1={Y(0)} y2={Y(0)} stroke="var(--muted)" strokeDasharray="3 3" />
      {groups.map((g, i) => {
        const v = clean[i];
        if (!v.length) return null;
        const q1 = quantile(v, 0.25);
        const q2 = median(v);
        const q3 = quantile(v, 0.75);
        const iqr = q3 - q1;
        const wl = Math.max(Math.min(...v), q1 - 1.5 * iqr);
        const wh = Math.min(Math.max(...v), q3 + 1.5 * iqr);
        const ci = tCI(v);
        const cx = L + bw * i + bw * 0.38;
        return (
          <g key={g.label}>
            <title>{`${g.label}\nmedian ${valueFmt(q2)} · IQR [${valueFmt(q1)}, ${valueFmt(q3)}]\nmean ${valueFmt(ci.m)} · 95% CI [${valueFmt(ci.lo)}, ${valueFmt(ci.hi)}]\n${v.length} folds`}</title>
            <line x1={cx} x2={cx} y1={Y(wl)} y2={Y(wh)} stroke={g.color} />
            <rect x={cx - bw * 0.16} y={Y(q3)} width={bw * 0.32} height={Math.max(1, Y(q1) - Y(q3))} fill={g.color} fillOpacity={0.22} stroke={g.color} />
            <line x1={cx - bw * 0.16} x2={cx + bw * 0.16} y1={Y(q2)} y2={Y(q2)} stroke={g.color} strokeWidth={2} />
            {v
              .filter((x) => x < wl || x > wh)
              .map((x, k) => (
                <circle key={k} cx={cx} cy={Y(x)} r={2.5} fill="none" stroke={g.color} />
              ))}
            {isNum(ci.lo) && <line x1={cx + bw * 0.28} x2={cx + bw * 0.28} y1={Y(ci.lo)} y2={Y(ci.hi)} stroke="var(--red)" strokeWidth={2} />}
            <circle cx={cx + bw * 0.28} cy={Y(ci.m)} r={4} fill="var(--red)" />
            <text x={cx + bw * 0.06} y={h - 10} textAnchor="middle" className={g.bold ? c.boldText : undefined}>
              {g.label}
            </text>
            <rect x={L + bw * i} y={0} width={bw} height={h} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

/** Settings × folds, coloured green (gain) to red (loss). */
export function Heatmap({ rows, columns }: { rows: { label: string; values: (number | null)[]; bold?: boolean }[]; columns: string[] }) {
  const all = rows.flatMap((r) => r.values.filter(isNum));
  const m = Math.max(...all.map(Math.abs), 1e-9);
  const color = (v: number | null) => {
    if (!isNum(v)) return "transparent";
    const t = Math.min(1, Math.abs(v) / m);
    return `color-mix(in srgb, ${v >= 0 ? "var(--green)" : "var(--red)"} ${Math.round(15 + t * 75)}%, var(--panel))`;
  };
  return (
    <div className={c.heatWrap}>
      <table className={c.heat}>
        <thead>
          <tr>
            <th />
            {columns.map((q, i) => (
              <th key={q} scope="col">
                {i % 4 === 0 ? q.slice(0, 4) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className={r.bold ? c.boldCell : undefined}>
                {r.label}
              </th>
              {r.values.map((v, i) => (
                <td key={columns[i] ?? i} style={{ background: color(v) }} title={`${r.label} · ${columns[i]}: ${pct(v)}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One dot per fold: precision (x) against PnL (y), with lines at the base rate and zero. */
export function Scatter({
  groups,
  xRef,
}: {
  groups: { label: string; color: string; bold?: boolean; points: { x: number; y: number; label: string }[] }[];
  xRef?: number | null;
}) {
  const w = 560;
  const h = 280;
  const L = 48;
  const B = 28;
  const pts = groups.flatMap((g) => g.points);
  const [xl, xh] = extent(pts.map((p) => p.x), isNum(xRef) ? [xRef] : []);
  const [yl, yh] = extent(pts.map((p) => p.y), [0]);
  const X = scale(xl, xh, L, w - 10);
  const Y = scale(yl, yh, h - B, 10);
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${h}`} role="img">
      {ticks(yl, yh, 4).map((t) => (
        <g key={t}>
          <line className={c.grid} x1={L} x2={w - 10} y1={Y(t)} y2={Y(t)} />
          <text x={L - 6} y={Y(t) + 4} textAnchor="end">
            {pct(t, 0)}
          </text>
        </g>
      ))}
      {ticks(xl, xh, 5).map((t) => (
        <text key={t} x={X(t)} y={h - 8} textAnchor="middle">
          {t.toFixed(1)}
        </text>
      ))}
      <line x1={L} x2={w - 10} y1={Y(0)} y2={Y(0)} stroke="var(--muted)" strokeDasharray="3 3" />
      {isNum(xRef) && (
        <g>
          <line x1={X(xRef)} x2={X(xRef)} y1={10} y2={h - B} stroke="var(--amber)" strokeDasharray="4 3" />
          <text x={X(xRef) + 4} y={20} style={{ fill: "var(--amber)" }}>
            base rate
          </text>
        </g>
      )}
      <text x={w - 12} y={20} textAnchor="end" style={{ fill: "var(--green)" }}>
        both good ↗
      </text>
      {groups.map((g) =>
        g.points.map((p) => (
          <circle key={`${g.label}-${p.label}`} cx={X(p.x)} cy={Y(p.y)} r={g.bold ? 4 : 3} fill={g.color} fillOpacity={g.bold ? 0.95 : 0.5}>
            <title>{`${g.label} · ${p.label}\nprecision ${p.x.toFixed(2)}\nPnL ${pct(p.y)}`}</title>
          </circle>
        )),
      )}
    </svg>
  );
}

/** One setting: its folds as faint dots, plus the mean ± 95% CI cross (t, n = folds) in both directions. */
export function FoldScatter({
  points,
  color,
  bold,
  xRef,
  xFmt = (x) => x.toFixed(2),
  yFmt = (y) => pct(y, 0),
  height = 220,
}: {
  points: { x: number; y: number; label: string }[];
  color: string;
  bold?: boolean;
  xRef: number;
  xFmt?: (x: number) => string;
  yFmt?: (y: number) => string;
  height?: number;
}) {
  const w = 300;
  const h = height;
  const L = 40;
  const B = 22;
  const [xl, xh] = extent(points.map((p) => p.x), [xRef]);
  const [yl, yh] = extent(points.map((p) => p.y), [0]);
  const X = scale(xl, xh, L, w - 8);
  const Y = scale(yl, yh, h - B, 8);
  const cx = tCI(points.map((p) => p.x));
  const cy = tCI(points.map((p) => p.y));
  return (
    <svg className={c.chart} viewBox={`0 0 ${w} ${h}`} role="img">
      {ticks(yl, yh, 4).map((t) => (
        <g key={t}>
          <line className={c.grid} x1={L} x2={w - 8} y1={Y(t)} y2={Y(t)} />
          <text x={L - 5} y={Y(t) + 4} textAnchor="end">
            {yFmt(t)}
          </text>
        </g>
      ))}
      {ticks(xl, xh, 4).map((t) => (
        <text key={t} x={X(t)} y={h - 6} textAnchor="middle">
          {xFmt(t)}
        </text>
      ))}
      <line x1={L} x2={w - 8} y1={Y(0)} y2={Y(0)} stroke="var(--muted)" strokeDasharray="3 3" />
      <line x1={X(xRef)} x2={X(xRef)} y1={8} y2={h - B} stroke="var(--amber)" strokeDasharray="4 3" />
      {points.map((p) => (
        <circle key={p.label} cx={X(p.x)} cy={Y(p.y)} r={2.6} fill={color} fillOpacity={0.35}>
          <title>{`${p.label}: x ${xFmt(p.x)}, y ${yFmt(p.y)}`}</title>
        </circle>
      ))}
      {isNum(cx.lo) && isNum(cy.lo) && (
        <g stroke={color} strokeWidth={bold ? 2.2 : 1.8}>
          <line x1={X(cx.lo)} x2={X(cx.hi)} y1={Y(cy.m)} y2={Y(cy.m)} />
          <line x1={X(cx.lo)} x2={X(cx.lo)} y1={Y(cy.m) - 4} y2={Y(cy.m) + 4} />
          <line x1={X(cx.hi)} x2={X(cx.hi)} y1={Y(cy.m) - 4} y2={Y(cy.m) + 4} />
          <line x1={X(cx.m)} x2={X(cx.m)} y1={Y(cy.lo)} y2={Y(cy.hi)} />
          <line x1={X(cx.m) - 4} x2={X(cx.m) + 4} y1={Y(cy.lo)} y2={Y(cy.lo)} />
          <line x1={X(cx.m) - 4} x2={X(cx.m) + 4} y1={Y(cy.hi)} y2={Y(cy.hi)} />
        </g>
      )}
      {isNum(cx.m) && (
        <circle cx={X(cx.m)} cy={Y(cy.m)} r={bold ? 5.5 : 4.5} fill={color} stroke="var(--text)" strokeWidth={1.2}>
          <title>{`mean x ${xFmt(cx.m)} [${xFmt(cx.lo)}, ${xFmt(cx.hi)}]\nmean y ${yFmt(cy.m)} [${yFmt(cy.lo)}, ${yFmt(cy.hi)}]\nn = ${points.length} folds`}</title>
        </circle>
      )}
    </svg>
  );
}

/** A planned panel this path didn't compute. */
export function NotComputed({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={c.notComputed}>
      <b>{title}</b> — not computed in this path. {children}
    </div>
  );
}
