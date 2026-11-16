"use client";

// Extra components a path can switch on in its paths.ts entry (`extras: ["tests", …]`). Each reads
// optional tables logged on the run (see PathConfig.artifacts) and shows nothing until they exist.
import type { ReactNode } from "react";
import { GroupBars, Histogram, Legend, LineChart, f2, f3, pct } from "./charts";
import type { PathResults, SettingResult } from "./data";
import { isNum, mean, sd } from "./stats";
import type { PathConfig, Row } from "./types";
import c from "./results.module.css";

export type ExtraView = "holdout" | "settings" | "choice" | "insample" | "findings" | "about";
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
                    <td>{t.decision === "reject_h0" ? <span className={c.pillGood}>Reject H0</span> : <span className={c.pill}>Can&apos;t reject</span>}</td>
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

/** Registry: name used in paths.ts → the tabs it shows on and the component. */
export const EXTRAS: Record<string, { views: ExtraView[]; Component: (p: Props) => ReactNode }> = {
  tests: { views: ["holdout", "insample"], Component: Tests },
  excess: { views: ["holdout", "insample"], Component: Excess },
  breadth: { views: ["holdout", "insample"], Component: Breadth },
  icPerDate: { views: ["settings"], Component: IcPerDate },
  quintiles: { views: ["settings"], Component: Quintiles },
  contribution: { views: ["insample"], Component: Contribution },
};
