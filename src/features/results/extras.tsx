"use client";

// Extra components a path can switch on in its paths.ts entry (`extras: ["tests", …]`). Each reads
// optional tables logged on the run (see PathConfig.artifacts) and shows nothing until they exist.
import type { ReactNode } from "react";
import { useState } from "react";
import { CIChart, GroupBars, Histogram, Legend, LineChart, f2, f3, pct } from "./charts";
import type { Daily, PathResults, SettingResult } from "./data";
import { equityFromLog, isNum, mean, sd, tCI } from "./stats";
import type { PathConfig, Row } from "./types";
import c from "./results.module.css";

export type ExtraView = "holdout" | "settings" | "choice" | "insample" | "vsmomentum" | "findings" | "about";
type Mode = "net" | "gross";
type Props = { cfg: PathConfig; data: PathResults; mode: Mode; view: ExtraView };

const SERIES = ["var(--accent)", "var(--amber)", "var(--green)", "var(--violet)", "#e8793a"];
const STRAT = "var(--accent)";
const BENCH = "var(--muted)";
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const day = (x: unknown) => String(x).slice(0, 10);

function Card({ title, sub, children, source }: { title: string; sub?: ReactNode; children: ReactNode; source?: string }) {
  return (
    <div className={c.card}>
      <h3 className={c.cardTitle}>{title}</h3>
      {sub && <p className={c.cardSub}>{sub}</p>}
      {children}
      {source && <p className={c.source}>source: {source}</p>}
    </div>
  );
}

/** The run a holdout or in-sample tab is about. */
function runFor(data: PathResults, view: ExtraView) {
  if (view === "holdout" && data.holdout) return { name: data.holdout.run.name, extra: data.holdout.extra, daily: data.holdout.daily };
  if (data.chosen) return { name: data.chosen.run.name, extra: data.chosen.extra, daily: data.chosen.daily };
  return null;
}

/* ---------------- Tests: table + null distributions ---------------- */

function Tests({ cfg, data, view }: Props) {
  const r = runFor(data, view);
  const rows = r?.extra.tests ?? [];
  if (!r || !rows.length) return null;
  const nulls = r.extra.nullDistributions ?? [];
  const byTest = new Map<string, Row[]>();
  rows.forEach((t) => byTest.set(String(t.test), [...(byTest.get(String(t.test)) ?? []), t]));
  const groups = new Map<string, number[]>();
  nulls.forEach((x) => {
    const k = `${x.test}|${x.metric}`;
    const v = num(x.value);
    if (v !== null) groups.set(k, [...(groups.get(k) ?? []), v]);
  });
  const fmt = (x: number | null) => (isNum(x) ? (Math.abs(x) < 10 ? x.toFixed(3) : x.toFixed(1)) : "–");
  return (
    <>
      <Card
        title={`Tests (${view === "holdout" ? "holdout" : "in sample"})`}
        sub="One row per test and metric. Effect = real value − centre of the null. Decision at α = 0.05."
        source={`${r.name} → ${cfg.artifacts.tests}`}
      >
        <div className={c.scroll}>
          <table className={`${c.table} ${c.choiceTable}`}>
            <thead>
              <tr>
                <th scope="col">Test / metric</th>
                <th scope="col">Real</th>
                <th scope="col">Null centre</th>
                <th scope="col">Effect</th>
                <th scope="col">p-value</th>
                <th scope="col">95% range</th>
                <th scope="col">n</th>
                <th scope="col">Decision</th>
              </tr>
            </thead>
            <tbody>
              {[...byTest.entries()].map(([test, items]) => [
                <tr key={test}>
                  <td colSpan={8}>
                    <b>{test.replace(/_/g, " ")}</b>
                    <span className={c.muted}> · H0: {String(items[0].hypothesis ?? "–")}</span>
                    {items[0].why_this_test ? <div className={c.muted}>Why: {String(items[0].why_this_test)}</div> : null}
                  </td>
                </tr>,
                ...items.map((t) => (
                  <tr key={`${test}-${t.metric}`}>
                    <td className={c.stepCell}>{String(t.metric)}</td>
                    <td className={c.strongCell}>{fmt(num(t.statistic))}</td>
                    <td>{fmt(num(t.null_center))}</td>
                    <td>{fmt(num(t.effect_size))}</td>
                    <td>{f3(num(t.p_value))}</td>
                    <td className={c.muted}>
                      [{fmt(num(t.ci_low))}, {fmt(num(t.ci_high))}] {t.ci_type ? `${t.ci_type}` : ""}
                    </td>
                    <td>{num(t.n) ?? "–"}</td>
                    <td>
                      {t.decision === "reject_h0" ? (
                        <span className={c.pillGood}>Reject H0</span>
                      ) : t.decision === "not_testable" ? (
                        <span className={c.pill} title="Not enough data for this test; not a failure.">Not testable</span>
                      ) : (
                        <span className={c.pill}>Can&apos;t reject</span>
                      )}
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </Card>
      {groups.size > 0 && (
        <Card title="Null distributions" sub="What each metric looks like under the test's null (shuffles or resamples). Red line = the real value." source={`${r.name} → ${cfg.artifacts.nullDistributions}`}>
          <div className={c.smallMultiples}>
            {[...groups.entries()].map(([k, vals]) => {
              const [test, metric] = k.split("|");
              const real = num(rows.find((t) => t.test === test && t.metric === metric)?.statistic);
              return (
                <div key={k} className={c.mini}>
                  <p className={c.miniTitle}>{test.replace(/_/g, " ")}</p>
                  <p className={c.miniSub}>
                    {metric} · {vals.length} draws
                  </p>
                  <Histogram values={vals} mark={real} color={STRAT} />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

/* ---------------- Excess return over the benchmark ---------------- */

function Excess({ cfg, data, view }: Props) {
  const r = runFor(data, view);
  if (!r?.daily) return null;
  const d = r.daily;
  const ex = d.net.map((x, i) => x - d.bench[i]);
  let s = 0;
  const cum = ex.map((x) => Math.exp((s += x)) - 1);
  const win = 63;
  const ir = ex.map((_, i) => {
    if (i < win - 1) return null;
    const w = ex.slice(i - win + 1, i + 1);
    const v = sd(w);
    return v > 0 ? (mean(w) / v) * Math.sqrt(252) : null;
  });
  return (
    <div className={c.two}>
      <Card title="Excess return over the benchmark" sub={`Cumulative, net of costs, vs ${cfg.benchmark.toLowerCase()}.`} source={`${r.name} → ${cfg.artifacts.daily}`}>
        <LineChart dates={d.dates} series={[{ name: "Excess return", values: cum, color: STRAT }]} fmt={(x) => pct(x, 0)} reference={0} />
      </Card>
      <Card title="Rolling information ratio" sub={`${win}-day window, annualised. Above 0 = beating the benchmark in that window.`} source={`${r.name} → ${cfg.artifacts.daily}`}>
        <LineChart dates={d.dates} series={[{ name: "Information ratio", values: ir, color: STRAT }]} fmt={f2} reference={0} />
      </Card>
    </div>
  );
}

/* ---------------- Names held, turnover, cost drag ---------------- */

function Breadth({ cfg, data, view }: Props) {
  const r = runFor(data, view);
  if (!r) return null;
  const detail = r.extra.portfolioDetail ?? [];
  const reb = r.extra.rebalanceMetrics ?? [];
  if (!detail.length && !reb.length) return null;
  let cost = 0;
  const cumCost = reb.map((x) => (cost += num(x.cost_drag) ?? 0));
  return (
    <div className={c.two}>
      {detail.length > 0 && (
        <Card title="Names held" sub="Number of stocks in the portfolio each day." source={`${r.name} → ${cfg.artifacts.portfolioDetail}`}>
          <LineChart dates={detail.map((x) => day(x.datetime))} series={[{ name: "Names held", values: detail.map((x) => num(x.names_held)), color: STRAT }]} fmt={(x) => x.toFixed(0)} />
        </Card>
      )}
      {reb.length > 0 && (
        <Card title="Turnover and cost drag per rebalance" sub="Turnover = (buys + sells) ÷ (2 × names held). Dashed = cumulative cost drag (log)." source={`${r.name} → ${cfg.artifacts.rebalanceMetrics}`}>
          <Legend
            items={[
              { label: "Turnover", color: STRAT },
              { label: "Cumulative cost drag", color: "var(--red)", dashed: true },
            ]}
          />
          <LineChart dates={reb.map((x) => day(x.datetime))} series={[{ name: "Turnover", values: reb.map((x) => num(x.turnover)), color: STRAT }]} fmt={(x) => pct(x, 0)} height={160} />
          <LineChart dates={reb.map((x) => day(x.datetime))} series={[{ name: "Cumulative cost drag", values: cumCost, color: "var(--red)", dashed: true }]} fmt={(x) => pct(x, 1)} height={140} />
        </Card>
      )}
    </div>
  );
}

/* ---------------- IC per rebalance date ---------------- */

function IcPerDate({ cfg, data }: Props) {
  const withIc = data.settings.filter((s) => (s.extra.rebalanceMetrics ?? []).length);
  if (!withIc.length) return null;
  const stats = (s: SettingResult) => {
    const ic = (s.extra.rebalanceMetrics ?? []).map((x) => num(x.ic)).filter(isNum);
    const m = mean(ic);
    const t = ic.length > 1 ? m / (sd(ic) / Math.sqrt(ic.length)) : NaN;
    return { n: ic.length, m, t, pos: ic.filter((x) => x > 0).length / ic.length };
  };
  const ch = data.chosen && withIc.includes(data.chosen) ? data.chosen : withIc[0];
  const reb = ch.extra.rebalanceMetrics ?? [];
  const ic = reb.map((x) => num(x.ic));
  const roll = ic.map((_, i) => {
    const w = ic.slice(Math.max(0, i - 11), i + 1).filter(isNum);
    return i >= 11 && w.length ? mean(w) : null;
  });
  return (
    <Card title="Cross-sectional IC per rebalance date" sub="Rank correlation between the signal and the return until the next rebalance, across stocks on each date." source={`${cfg.artifacts.rebalanceMetrics} → ic`}>
      <div className={c.twoOne}>
        <div>
          <Legend
            items={[
              { label: `${ch.label}, each date`, color: STRAT },
              { label: "12-date rolling mean", color: "var(--amber)" },
            ]}
          />
          <LineChart
            dates={reb.map((x) => day(x.datetime))}
            series={[
              { name: "IC", values: ic, color: STRAT, faint: true },
              { name: "Rolling mean", values: roll, color: "var(--amber)" },
            ]}
            fmt={f2}
            reference={0}
          />
        </div>
        <table className={c.table}>
          <thead>
            <tr>
              <th scope="col">{cfg.setting.name}</th>
              <th scope="col">Mean IC</th>
              <th scope="col">t</th>
              <th scope="col">Dates IC &gt; 0</th>
            </tr>
          </thead>
          <tbody>
            {withIc.map((s) => {
              const st = stats(s);
              return (
                <tr key={s.run.run_id} className={s.chosen ? c.chosenRow : undefined}>
                  <td>{s.label}</td>
                  <td className={st.m > 0 ? c.good : c.bad}>{f3(st.m)}</td>
                  <td>{f2(st.t)}</td>
                  <td>
                    {pct(st.pos, 0)} <span className={c.muted}>of {st.n}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={c.tableNote}>t = mean ÷ (sd ÷ √dates); |t| above about 2 suggests the mean IC is not 0.</p>
    </Card>
  );
}

/* ---------------- Signal-quintile returns ---------------- */

function Quintiles({ cfg, data }: Props) {
  const withQ = data.settings.filter((s) => (s.extra.quantileReturns ?? []).length);
  if (!withQ.length) return null;
  const qs = [1, 2, 3, 4, 5];
  const series = withQ.map((s) => {
    const rows = s.extra.quantileReturns ?? [];
    return {
      name: s.label,
      values: qs.map((q) => mean(rows.filter((x) => Number(x.quantile) === q).map((x) => num(x.mean_held_return)).filter(isNum))),
      color: SERIES[data.settings.indexOf(s) % 5],
    };
  });
  return (
    <Card
      title="Return by signal quintile"
      sub="Stocks split into fifths by the signal on each rebalance date (1 = weakest momentum). Mean log return until the next rebalance, before costs. Rising left to right = the signal ranks stocks well."
      source={`${cfg.artifacts.quantileReturns} → mean_held_return`}
    >
      <Legend items={series.map((s) => ({ label: `${s.name} (Q5 − Q1 ${pct(s.values[4] - s.values[0], 2)})`, color: s.color }))} />
      <GroupBars labels={qs.map((q) => `Q${q}`)} series={series} fmt={(x) => pct(x, 1)} />
    </Card>
  );
}

/* ---------------- Per-stock contribution ---------------- */

function Contribution({ cfg, data }: Props) {
  const ch = data.chosen;
  const rows = (ch?.extra.stockContribution ?? []).filter((x) => isNum(num(x.contribution)));
  if (!ch || !rows.length) return null;
  const sorted = [...rows].sort((a, b) => (num(b.contribution) ?? 0) - (num(a.contribution) ?? 0));
  const top = sorted.slice(0, 15);
  const bottom = sorted.slice(-15).reverse();
  const maxAbs = Math.max(...rows.map((x) => Math.abs(num(x.contribution) ?? 0))) || 1;
  const total = rows.reduce((s, x) => s + (num(x.contribution) ?? 0), 0);
  const topShare = top.reduce((s, x) => s + (num(x.contribution) ?? 0), 0) / total;
  const table = (list: Row[], title: string) => (
    <div>
      <p className={c.miniTitle}>{title}</p>
      <table className={c.table}>
        <thead>
          <tr>
            <th scope="col">Stock</th>
            <th scope="col">Contribution</th>
            <th scope="col">Days held</th>
            <th scope="col">Trades</th>
          </tr>
        </thead>
        <tbody>
          {list.map((x) => {
            const v = num(x.contribution) ?? 0;
            return (
              <tr key={String(x.ticker)}>
                <td>{String(x.ticker)}</td>
                <td>
                  <span className={c.contribBar} style={{ width: `${(Math.abs(v) / maxAbs) * 60}px`, background: v >= 0 ? "var(--green)" : "var(--red)" }} />
                  <span className={v >= 0 ? c.good : c.bad}>{pct(v, 2)}</span>
                </td>
                <td>{num(x.days_held) ?? "–"}</td>
                <td>{num(x.n_trades) ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  return (
    <Card
      title={`Per-stock contribution, ${ch.label}`}
      sub={`Log points of the portfolio's return from each stock, net of costs. ${rows.length} stocks; the top 15 add ${pct(topShare, 0)} of the total.`}
      source={`${ch.run.name} → ${cfg.artifacts.stockContribution}`}
    >
      <div className={c.two}>
        {table(top, "Top 15")}
        {table(bottom, "Bottom 15")}
      </div>
    </Card>
  );
}

/* ================= ML paths (from path 3): hyperparameter grids, overfitting, momentum comparison ================= */

const runMetric = (run: { metrics: Record<string, unknown> }, k: string) => num(run.metrics[k]);
const sortVals = (v: string[]) => [...new Set(v)].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
const quarter = (fold: unknown) => {
  const s = String(fold).slice(0, 10);
  return `${s.slice(0, 4)}-Q${Math.floor((Number(s.slice(5, 7)) - 1) / 3) + 1}`;
};
const signed = (x: number | null) => (isNum(x) ? (x >= 0 ? "+" : "") + x.toFixed(3) : "–");

const GRID_METRICS: [string, string, (x: number | null) => string, "higher" | "lower"][] = [
  ["sharpe", "Sharpe", f2, "higher"],
  ["pnl", "PnL", (x) => pct(x), "higher"],
  ["rebalance_precision", "Precision, rebalance days", f3, "higher"],
  ["precision_all_days", "Precision, all days", f3, "higher"],
  ["rebalance_ic", "IC, rebalance days", signed, "higher"],
  ["ic", "IC, all days", signed, "higher"],
  ["rebalance_auc", "AUC, rebalance days", f3, "higher"],
  ["auc", "AUC, all days", f3, "higher"],
  ["train_test_gap", "Train − test gap", f3, "lower"],
  ["max_drawdown", "Max drawdown", (x) => pct(x), "higher"],
];

/** Two-parameter grid (e.g. C × l1_ratio): one run metric per cell, chosen setting outlined. */
function HyperGrid({ cfg, data }: Props) {
  const options = GRID_METRICS.filter(([k]) => data.settings.some((x) => isNum(runMetric(x.run, k))));
  const [key, setKey] = useState(options[0]?.[0] ?? "sharpe");
  const ps = cfg.setting.params;
  if (!ps || ps.length !== 2 || !options.length) return null;
  const [rp, cp] = ps;
  const m = options.find((o) => o[0] === key) ?? options[0];
  const rows = sortVals(data.settings.map((x) => x.run.params[rp]));
  const cols = sortVals(data.settings.map((x) => x.run.params[cp]));
  const cell = (rv: string, cv: string) => data.settings.find((x) => x.run.params[rp] === rv && x.run.params[cp] === cv);
  const vals = data.settings.map((x) => runMetric(x.run, m[0])).filter(isNum).sort((a, b) => a - b);
  const rank = (v: number) => (vals.length > 1 ? vals.indexOf(v) / (vals.length - 1) : 1);
  return (
    <Card title={`${rp} × ${cp} grid`} sub="One cell per setting; darker green = better on the chosen metric. Outlined = the chosen setting." source="run metrics">
      <select className={c.metricPick} value={m[0]} onChange={(e) => setKey(e.target.value)} aria-label="Metric">
        {options.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <div className={c.scroll}>
        <table className={c.grid2}>
          <thead>
            <tr>
              <th scope="col">
                {rp} ↓ · {cp} →
              </th>
              {cols.map((cv) => (
                <th key={cv} scope="col">
                  {cv}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rv) => (
              <tr key={rv}>
                <th scope="row">{rv}</th>
                {cols.map((cv) => {
                  const x = cell(rv, cv);
                  const v = x ? runMetric(x.run, m[0]) : null;
                  const t = isNum(v) ? (m[3] === "higher" ? rank(v) : 1 - rank(v)) : 0;
                  return (
                    <td
                      key={cv}
                      className={x?.chosen ? c.gridChosen : undefined}
                      style={{ background: isNum(v) ? `color-mix(in srgb, var(--green) ${Math.round(8 + t * 62)}%, var(--panel))` : undefined }}
                      title={x ? `${x.label}: ${m[2](v)}` : "not run"}
                    >
                      {x ? m[2](v) : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Precision / IC / AUC per setting with 95% CIs, coloured by the first param, all days and rebalance days side by side. */
function GroupedCI({ cfg, data }: Props) {
  const [which, setWhich] = useState<"precision" | "ic" | "auc">("precision");
  const s = data.settings;
  if (!s.length) return null;
  const firstParam = cfg.setting.params?.[0] ?? cfg.setting.param;
  const groups = sortVals(s.map((x) => x.run.params[firstParam] ?? ""));
  const color = (x: SettingResult) => SERIES[groups.indexOf(x.run.params[firstParam] ?? "") % SERIES.length];
  const col = { precision: "precision", ic: "ic_spearman", auc: "auc" }[which];
  const panels = [
    { name: "All days", values: (x: SettingResult) => (x.extra.mlPerFoldAll ?? []).map((r) => num(r[col])), base: (x: SettingResult) => (x.extra.mlPerFoldAll ?? []).map((r) => num(r.base_rate)) },
    { name: "Rebalance days", values: (x: SettingResult) => x.folds.map((f) => (which === "precision" ? f.precision : which === "ic" ? f.ic : f.auc)), base: (x: SettingResult) => x.folds.map((f) => f.baseRate) },
  ].filter((p) => s.some((x) => p.values(x).some(isNum)));
  if (!panels.length) return null;
  const ref = (p: (typeof panels)[number]) => {
    if (which === "ic") return { v: 0, label: "0" };
    if (which === "auc") return { v: 0.5, label: "random 0.5" };
    const b = mean(s.flatMap((x) => p.base(x)).filter(isNum));
    return { v: b, label: `base rate ${f3(b)}` };
  };
  return (
    <Card
      title="Prediction quality by setting"
      sub={`Mean ± 95% CI over folds (t, n = valid folds, shown per row). Colour = ${firstParam}. Folds with no "up" predictions or a constant score are left out.`}
      source={`${cfg.artifacts.mlPerFoldAll ?? "fold_metrics.json"}, ${cfg.artifacts.mlPerFold}`}
    >
      <span className={c.seg} role="radiogroup" aria-label="Metric" style={{ marginBottom: 10 }}>
        {(["precision", "ic", "auc"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={which === k} onClick={() => setWhich(k)}>
            {k === "precision" ? "Precision" : k.toUpperCase()}
          </button>
        ))}
      </span>
      <Legend items={groups.map((g) => ({ label: `${firstParam} = ${g}`, color: SERIES[groups.indexOf(g) % SERIES.length] }))} />
      <div className={c.two}>
        {panels.map((p) => (
          <div key={p.name}>
            <p className={c.miniTitle}>{p.name}</p>
            <CIChart
              rows={s.map((x) => ({ label: `${x.label} (n=${tCI(p.values(x)).n})`, values: p.values(x), color: color(x), bold: x.chosen }))}
              reference={ref(p).v}
              referenceLabel={ref(p).label}
              rowH={20}
              labelW={170}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Train vs test precision per fold for the chosen setting: a large, steady gap means overfitting. */
function TrainTest({ cfg, data }: Props) {
  const ch = data.chosen;
  const rows = ch?.extra.trainTest ?? [];
  if (!ch || !rows.length) return null;
  const days = sortVals(rows.map((r) => String(r.days)));
  return (
    <Card title={`Train vs test precision, ${ch.label}`} sub="Per fold. Train much higher than test, fold after fold = overfitting. Close together = no overfitting (this rules settings out; it doesn't rank them)." source={`${ch.run.name} → ${cfg.artifacts.trainTest}`}>
      <Legend
        items={[
          { label: "Train", color: BENCH },
          { label: "Test", color: STRAT },
        ]}
      />
      {days.map((d) => {
        const r = rows.filter((x) => String(x.days) === d);
        const gap = mean(r.map((x) => (num(x.train_precision) ?? NaN) - (num(x.test_precision) ?? NaN)).filter(isNum));
        return (
          <div key={d}>
            <p className={c.miniTitle}>
              {d === "all" ? "All days" : d === "rebalance" ? "Rebalance days" : d} · mean gap {f3(gap)}
            </p>
            <GroupBars
              labels={r.map((x) => quarter(x.fold))}
              series={[
                { name: "Train", values: r.map((x) => num(x.train_precision) ?? NaN), color: BENCH },
                { name: "Test", values: r.map((x) => num(x.test_precision) ?? NaN), color: STRAT },
              ]}
              fmt={(x) => pct(x, 0)}
              height={170}
            />
          </div>
        );
      })}
    </Card>
  );
}

/** Coefficient of each feature per fold (standardised features) for the chosen setting: steady sign = stable effect. */
function Coefficients({ cfg, data }: Props) {
  const ch = data.chosen;
  const rows = ch?.extra.coefficients ?? [];
  if (!ch || !rows.length) return null;
  const folds = [...new Set(rows.map((r) => String(r.fold)))].sort();
  const features = [...new Set(rows.map((r) => String(r.feature)))];
  const series = features.map((f, i) => ({
    name: f,
    values: folds.map((fo) => num(rows.find((r) => String(r.fold) === fo && String(r.feature) === f)?.coefficient)),
    color: SERIES[i % SERIES.length],
  }));
  return (
    <Card title={`Coefficients by fold, ${ch.label}`} sub="On standardised features, so sizes are comparable. A feature that keeps its sign across folds has a stable effect." source={`${ch.run.name} → ${cfg.artifacts.coefficients}`}>
      <Legend items={series.map((x) => ({ label: x.name, color: x.color }))} />
      <LineChart dates={folds.map((f) => f.slice(0, 10))} series={series} fmt={f2} reference={0} />
      <table className={c.table}>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">Mean</th>
            <th scope="col">SD</th>
            <th scope="col">Folds with the mean&apos;s sign</th>
          </tr>
        </thead>
        <tbody>
          {series.map((x) => {
            const v = x.values.filter(isNum);
            const m = mean(v);
            return (
              <tr key={x.name}>
                <td>{x.name}</td>
                <td className={m >= 0 ? c.good : c.bad}>{signed(m)}</td>
                <td>{f3(sd(v))}</td>
                <td>{pct(v.filter((y) => Math.sign(y) === Math.sign(m)).length / v.length, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/** Growth of 1 for model, momentum and buy-and-hold on the dates they share. */
function equityCompare(model: Daily, mom: Daily | null | undefined, mode: Mode) {
  const momBy = new Map((mom?.dates ?? []).map((d, i) => [d, (mode === "net" ? mom!.net : mom!.gross)[i]]));
  const idx = model.dates.map((d, i) => i).filter((i) => !mom || momBy.has(model.dates[i]));
  const r = mode === "net" ? model.net : model.gross;
  return {
    dates: idx.map((i) => model.dates[i]),
    model: equityFromLog(idx.map((i) => r[i])),
    bench: equityFromLog(idx.map((i) => model.bench[i])),
    mom: mom ? equityFromLog(idx.map((i) => momBy.get(model.dates[i]) ?? 0)) : null,
  };
}

function ComparisonBlock({ title, name, rows, model, mom, label, mode }: { title: string; name: string; rows: Row[]; model: Daily | null; mom: Daily | null | undefined; label: string; mode: Mode }) {
  const eq = model ? equityCompare(model, mom, mode) : null;
  const ci = (m: unknown, lo: unknown, hi: unknown) => (
    <>
      {f3(num(m))} <span className={c.muted}>[{f3(num(lo))}, {f3(num(hi))}]</span>
    </>
  );
  return (
    <Card title={title} sub="Same folds for both. Paired p = whether the per-fold difference is different from 0." source={name}>
      {rows.length > 0 && (
        <div className={c.scroll}>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Days</th>
                <th scope="col">{label}: mean [95% CI]</th>
                <th scope="col">pooled</th>
                <th scope="col">Momentum: mean [95% CI]</th>
                <th scope="col">pooled</th>
                <th scope="col">Paired p</th>
                <th scope="col">n</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const better = (num(r.model_mean) ?? NaN) > (num(r.momentum_mean) ?? NaN);
                const p = num(r.paired_p);
                return (
                  <tr key={i}>
                    <td>{String(r.metric)}</td>
                    <td className={c.muted}>{String(r.days)}</td>
                    <td className={better ? c.strongCell : undefined}>{ci(r.model_mean, r.model_ci_low, r.model_ci_high)}</td>
                    <td>{f3(num(r.model_pooled))}</td>
                    <td className={!better ? c.strongCell : undefined}>{ci(r.momentum_mean, r.momentum_ci_low, r.momentum_ci_high)}</td>
                    <td>{f3(num(r.momentum_pooled))}</td>
                    <td className={isNum(p) && p < 0.05 ? c.strongCell : undefined}>{f3(p)}</td>
                    <td>{num(r.n) ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {eq && eq.dates.length > 1 && (
        <>
          <p className={c.miniTitle} style={{ marginTop: 12 }}>
            Growth of 1, {mode === "net" ? "net of costs" : "gross"}
            {!mom && " · momentum run not found (tag compared_with_run)"}
          </p>
          <Legend
            items={[
              { label, color: STRAT },
              ...(eq.mom ? [{ label: "Momentum 22d", color: "var(--amber)" }] : []),
              { label: "Buy & hold", color: BENCH, dashed: true },
            ]}
          />
          <LineChart
            dates={eq.dates}
            series={[
              { name: label, values: eq.model, color: STRAT },
              ...(eq.mom ? [{ name: "Momentum 22d", values: eq.mom, color: "var(--amber)" }] : []),
              { name: "Buy & hold", values: eq.bench, color: BENCH, dashed: true },
            ]}
            fmt={f2}
            reference={1}
          />
        </>
      )}
    </Card>
  );
}

/** Own tab: the model against path 1's momentum, in sample and on the holdout. */
function VsMomentum({ cfg, data, mode }: Props) {
  const ch = data.chosen;
  const h = data.holdout;
  if (!ch && !h) return null;
  return (
    <>
      <p className={c.lead}>The chosen model against momentum (path 1) on the same stock and the same folds.</p>
      {ch && <ComparisonBlock title={`In sample: ${ch.label} vs momentum`} name={`${ch.run.name} → ${cfg.artifacts.comparison}`} rows={ch.extra.comparison ?? []} model={ch.daily} mom={ch.compared} label={ch.label} mode={mode} />}
      {h && <ComparisonBlock title="Holdout: model vs momentum" name={`${h.run.name} → ${cfg.artifacts.comparison}`} rows={h.extra.comparison ?? []} model={h.daily} mom={h.compared} label={ch?.label ?? "Model"} mode={mode} />}
    </>
  );
}

/** Holdout months split by the stock's own direction: does the model protect in down months and keep up in up months? */
function Regimes({ cfg, data }: Props) {
  const h = data.holdout;
  const rows = h?.extra.regimeReturns ?? [];
  if (!h || !rows.length) return null;
  const by = (reg: string, k: string) => rows.filter((r) => String(r.regime) === reg).map((r) => num(r[k])).filter(isNum);
  const regimes = ["up", "down"].filter((g) => rows.some((r) => String(r.regime) === g));
  return (
    <Card title="Up and down months" sub="Regime = the stock's own return that month. Capture = strategy's average ÷ buy & hold's average in that regime (up: higher is better; down: lower is better)." source={`${h.run.name} → ${cfg.artifacts.regimeReturns}`}>
      <div className={c.twoOne}>
        <div>
          <Legend
            items={[
              { label: "Buy & hold", color: BENCH },
              { label: "Momentum", color: "var(--amber)" },
              { label: "Model", color: STRAT },
            ]}
          />
          <GroupBars
            labels={rows.map((r) => String(r.month).slice(0, 7))}
            series={[
              { name: "Buy & hold", values: rows.map((r) => num(r.buy_and_hold) ?? NaN), color: BENCH },
              { name: "Momentum", values: rows.map((r) => num(r.momentum) ?? NaN), color: "var(--amber)" },
              { name: "Model", values: rows.map((r) => num(r.model) ?? NaN), color: STRAT },
            ]}
            fmt={(x) => pct(x, 0)}
          />
        </div>
        <table className={c.table}>
          <thead>
            <tr>
              <th scope="col">Regime</th>
              <th scope="col">Months</th>
              <th scope="col">B&amp;H avg</th>
              <th scope="col">Model avg</th>
              <th scope="col">Model capture</th>
              <th scope="col">Momentum capture</th>
            </tr>
          </thead>
          <tbody>
            {regimes.map((g) => {
              const bh = mean(by(g, "buy_and_hold"));
              return (
                <tr key={g}>
                  <td>{g}</td>
                  <td>{by(g, "buy_and_hold").length}</td>
                  <td>{pct(bh)}</td>
                  <td>{pct(mean(by(g, "model")))}</td>
                  <td>{f2(mean(by(g, "model")) / bh)}</td>
                  <td>{f2(mean(by(g, "momentum")) / bh)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Each feature's IC in sample and on the holdout: did the relationships hold? */
function FeatureIc({ cfg, data }: Props) {
  const h = data.holdout;
  const rows = h?.extra.featureIc ?? [];
  if (!h || !rows.length) return null;
  const features = [...new Set(rows.map((r) => String(r.feature)))];
  const ic = (f: string, p: string) => num(rows.find((r) => String(r.feature) === f && String(r.period) === p)?.ic);
  return (
    <Card title="Feature IC: in sample vs holdout" sub="Rank correlation of each feature with the forward return. A sign flip or a drop toward 0 on the holdout means the relationship didn't hold." source={`${h.run.name} → ${cfg.artifacts.featureIc}`}>
      <Legend
        items={[
          { label: "In sample", color: BENCH },
          { label: "Holdout", color: STRAT },
        ]}
      />
      <GroupBars
        labels={features}
        series={[
          { name: "In sample", values: features.map((f) => ic(f, "in_sample") ?? NaN), color: BENCH },
          { name: "Holdout", values: features.map((f) => ic(f, "holdout") ?? NaN), color: STRAT },
        ]}
        fmt={(x) => x.toFixed(2)}
        height={180}
      />
    </Card>
  );
}

/** Registry: name used in paths.ts → the tabs it shows on and the component. */
export const EXTRAS: Record<string, { views: ExtraView[]; Component: (p: Props) => ReactNode }> = {
  tests: { views: ["holdout", "insample"], Component: Tests },
  excess: { views: ["holdout", "insample"], Component: Excess },
  breadth: { views: ["holdout", "insample"], Component: Breadth },
  icPerDate: { views: ["settings"], Component: IcPerDate },
  quintiles: { views: ["settings"], Component: Quintiles },
  contribution: { views: ["insample"], Component: Contribution },
  hyperGrid: { views: ["settings"], Component: HyperGrid },
  groupedCI: { views: ["settings"], Component: GroupedCI },
  trainTest: { views: ["insample"], Component: TrainTest },
  coefficients: { views: ["insample"], Component: Coefficients },
  vsMomentum: { views: ["vsmomentum"], Component: VsMomentum },
  regimes: { views: ["holdout"], Component: Regimes },
  featureIc: { views: ["holdout"], Component: FeatureIc },
};
