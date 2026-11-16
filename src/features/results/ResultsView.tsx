"use client";

// Results dashboard for a section's MLflow pushes: one tab per research path, then a row of
// section buttons (Holdout results, Settings tried, …). Each path is described by a PathConfig.
import { useState, type ReactNode } from "react";
import { Button, EmptyState, Panel } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { BoxCI, CIChart, EquityChart, FoldScatter, GroupBars, Heatmap, Legend, NotComputed, PairBars, RocChart, f2, f3, pct } from "./charts";
import { ShareButton } from "@/features/share/ShareButton";
import { EXTRAS } from "./extras";
import { conditionalProbabilities, curves, decisionMetrics, hasAuc, parseConfigTag, periodReturns, usePathResults, type PathResults, type SettingResult, type Snapshot } from "./data";
import { corr, isNum, tCI } from "./stats";
import type { ChoiceTable, MlflowRun, PathConfig } from "./types";
import c from "./results.module.css";

type Mode = "net" | "gross";
type View = "holdout" | "settings" | "choice" | "insample" | "findings" | "about";



const SERIES = ["var(--accent)", "var(--amber)", "var(--green)", "var(--violet)", "#e8793a"];
const STRAT = "var(--accent)";
const sg = (x: number) => (isNum(x) ? `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}` : "–");
const BENCH = "var(--muted)";

function Source({ children }: { children: ReactNode }) {
  return <p className={c.source}>source: {children}</p>;
}

function Card({ title, sub, children, source }: { title: string; sub?: ReactNode; children: ReactNode; source?: string }) {
  return (
    <div className={c.card}>
      <h3 className={c.cardTitle}>{title}</h3>
      {sub && <p className={c.cardSub}>{sub}</p>}
      {children}
      {source && <Source>{source}</Source>}
    </div>
  );
}

/** Short benchmark name for table headers and legends. */
const bhName = (cfg: PathConfig) => (cfg.kind === "portfolio" ? "Benchmark" : "Buy-and-hold");

const metric = (run: MlflowRun, key: string, mode: Mode = "net") => {
  const m = run.metrics;
  const v = mode === "gross" && isNum(m[`${key}_gross`]) ? m[`${key}_gross`] : m[key];
  return isNum(v) ? v : null;
};

type Better = "higher" | "lower" | null;
function verdict(a: number | null, b: number | null, better: Better) {
  if (!better || !isNum(a) || !isNum(b)) return "";
  return (better === "higher" ? a >= b : a <= b) ? c.good : c.bad;
}

/** Strategy vs buy-and-hold metrics of one run, as a table.
 *  Colour = sign (green positive, red negative) for metrics where the sign matters.
 *  A green ▲ = better than buy-and-hold; no arrow = worse or no benchmark. */
function QuantTable({ run, label, mode, benchmark }: { run: MlflowRun; label: string; mode: Mode; benchmark: string }) {
  // [name, value, benchmark value, format, which way is better, does the sign carry meaning]
  const all: [string, number | null, number | null, (x: number | null) => string, Better, boolean][] = [
    ["PnL", metric(run, "pnl", mode), metric(run, "bh_pnl"), pct, "higher", true],
    ["CAGR", metric(run, "cagr", mode), metric(run, "bh_cagr"), pct, "higher", true],
    ["Sharpe", metric(run, "sharpe", mode), metric(run, "bh_sharpe"), f2, "higher", true],
    ["Sortino", metric(run, "sortino"), null, f2, null, true],
    ["Calmar", metric(run, "calmar"), null, f2, null, true],
    ["Max drawdown", metric(run, "max_drawdown"), metric(run, "bh_max_drawdown"), pct, "higher", false],
    ["Volatility", metric(run, "volatility"), metric(run, "bh_volatility"), pct, "lower", false],
    ["Drawdown duration", metric(run, "drawdown_duration_days"), null, (x) => (isNum(x) ? `${x.toFixed(0)} days` : "–"), null, false],
    ["Trades", metric(run, "n_trades"), null, (x) => (isNum(x) ? x.toFixed(0) : "–"), null, false],
    ["Exposure", metric(run, "exposure"), 1, (x) => pct(x, 0), null, false],
    ["Hit rate", metric(run, "hit_rate"), null, (x) => pct(x, 0), null, false],
    ["EV per trade", metric(run, "ev_per_trade"), null, (x) => pct(x, 2), null, true],
    ["Avg win", metric(run, "avg_win"), null, pct, null, true],
    ["Avg loss", metric(run, "avg_loss"), null, pct, null, true],
    // portfolio paths only; hidden when not logged
    ["Excess PnL", metric(run, "excess_pnl"), null, pct, null, true],
    ["Information ratio", metric(run, "information_ratio"), null, f2, null, true],
    ["Alpha (per year)", metric(run, "alpha"), null, pct, null, true],
    ["Beta", metric(run, "beta"), 1, f2, null, false],
    ["Avg names held", metric(run, "avg_holdings"), null, (x) => (isNum(x) ? x.toFixed(0) : "–"), null, false],
  ];
  const portfolioOnly = ["Excess PnL", "Information ratio", "Alpha (per year)", "Beta", "Avg names held"];
  const rows = all.filter(([name, a]) => isNum(a) || !portfolioOnly.includes(name));
  const beats = (a: number | null, b: number | null, better: Better) =>
    !!better && isNum(a) && isNum(b) && (better === "higher" ? a > b : a < b);
  return (
    <>
      <table className={c.table}>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">{label}</th>
            <th scope="col">{benchmark}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, a, b, f, better, signed]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className={signed && isNum(a) ? (a > 0 ? c.good : a < 0 ? c.bad : "") : ""}>
                {f(a)}
                <span className={c.arrow} aria-label={beats(a, b, better) ? "better than buy-and-hold" : undefined}>
                  {beats(a, b, better) ? "▲" : ""}
                </span>
              </td>
              <td>{b === null ? "–" : f(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={c.tableNote}>
        Green / red = positive / negative. <span className={c.good}>▲</span> = better than {benchmark.toLowerCase()} (for drawdown: smaller; for volatility: lower).
      </p>
    </>
  );
}

/* ------------------------------ 1. Holdout results ------------------------------ */

function HoldoutView({ cfg, data, mode }: { cfg: PathConfig; data: PathResults; mode: Mode }) {
  const h = data.holdout;
  if (!h) return <EmptyState title="The holdout hasn't been run for this path yet." />;
  const label = cfg.setting.label(h.run.params[cfg.setting.param] ?? "");
  const cv = curves(h.daily, mode);
  const dm = decisionMetrics(h.daily);
  const precision = metric(h.run, "rebalance_precision") ?? dm.precision;
  const base = metric(h.run, "base_rate") ?? dm.baseRate;
  const majority = isNum(base) ? Math.max(base, 1 - base) : NaN;
  const quarters = periodReturns(h.daily, h.folds, mode);
  const dates = h.daily.dates;
  const bars: [string, string, string, (x: number) => string][] = [
    ["PnL", "pnl", "bh_pnl", (x) => pct(x)],
    ["Sharpe", "sharpe", "bh_sharpe", (x) => x.toFixed(2)],
    ["Max drawdown", "max_drawdown", "bh_max_drawdown", (x) => pct(x)],
    ["Volatility", "volatility", "bh_volatility", (x) => pct(x)],
  ];
  return (
    <>
      <p className={c.lead}>
        {label} vs {cfg.benchmark}, {dates[0]} → {dates[dates.length - 1]}, {mode === "net" ? "net of costs" : "gross"}.
      </p>
      <div className={c.twoOne}>
        <Card title="Equity and drawdown" source={`${h.run.name} → ${cfg.artifacts.daily}`}>
          <Legend
            items={[
              { label, color: STRAT },
              { label: cfg.benchmark, color: BENCH, dashed: true },
            ]}
          />
          <EquityChart
            height={620}
            dates={dates}
            series={[
              { name: label, values: cv.equity, color: STRAT },
              { name: cfg.benchmark, values: cv.benchEquity, color: BENCH, dashed: true },
            ]}
            drawdowns={[
              { name: label, values: cv.dd, color: STRAT },
              { name: cfg.benchmark, values: cv.benchDd, color: BENCH, dashed: true },
            ]}
          />
        </Card>
        <Card title="Quant metrics" source={`${h.run.name} metrics`}>
          <QuantTable run={h.run} label={label} mode={mode} benchmark={bhName(cfg)} />
        </Card>
      </div>
      <div className={c.twoOne}>
        <Card title={`Strategy vs ${bhName(cfg).toLowerCase()}`} source={`${h.run.name} metrics`}>
          <Legend
            items={[
              { label, color: STRAT },
              { label: bhName(cfg), color: BENCH },
            ]}
          />
          <div className={c.miniGrid}>
            {bars.map(([title, k, bk, fmt]) => (
              <div key={title} className={c.mini}>
                <p className={c.miniTitle}>{title}</p>
                <PairBars
                  fmt={fmt}
                  items={[
                    { name: label, value: metric(h.run, k, mode), color: STRAT },
                    { name: bhName(cfg), value: metric(h.run, bk), color: BENCH },
                  ]}
                />
              </div>
            ))}
          </div>
        </Card>
        {cfg.kind === "portfolio" ? (
          <PortfolioMlCard run={h.run} label={label} />
        ) : (
        <Card
          title="ML metrics"
          sub={`Scored on the ${dm.decisions} rebalance decisions (${dm.longs} long calls), so noisy. Green / red = above / below the reference.`}
          source={`${h.run.name} → ${cfg.artifacts.daily}, metrics rebalance_precision, base_rate`}
        >
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">{label}</th>
                <th scope="col">Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Precision</td>
                <td className={verdict(precision, base, "higher")}>{f3(precision)}</td>
                <td>base rate {f3(base)}</td>
              </tr>
              <tr>
                <td>Recall</td>
                <td>{f3(dm.recall)}</td>
                <td>–</td>
              </tr>
              <tr>
                <td>Accuracy</td>
                <td className={verdict(dm.accuracy, majority, "higher")}>{f3(dm.accuracy)}</td>
                <td>majority guess {f3(majority)}</td>
              </tr>
              <tr>
                <td>IC (Spearman)</td>
                <td className={verdict(dm.ic, 0, "higher")}>{isNum(dm.ic) ? (dm.ic >= 0 ? "+" : "") + dm.ic.toFixed(2) : "–"}</td>
                <td>0</td>
              </tr>
              {isNum(dm.auc) && (
                <tr>
                  <td>AUC</td>
                  <td className={verdict(dm.auc, 0.5, "higher")}>{f3(dm.auc)}</td>
                  <td>random 0.500</td>
                </tr>
              )}
              <tr>
                <td>Decisions / long calls</td>
                <td>
                  {dm.decisions} / {dm.longs}
                </td>
                <td>–</td>
              </tr>
            </tbody>
          </table>
          {dm.roc.length > 0 && (
            <>
              <p className={c.miniTitle} style={{ marginTop: 12 }}>ROC curve · dashed = random</p>
              <RocChart series={[{ name: label, points: dm.roc, color: STRAT, bold: true }]} height={220} />
            </>
          )}
        </Card>
        )}
      </div>
      <Card title="PnL per quarter" source={`${h.run.name} → ${cfg.artifacts.daily}`}>
        <Legend
          items={[
            { label, color: STRAT },
            { label: bhName(cfg), color: BENCH },
          ]}
        />
        <GroupBars
          labels={quarters.map((q) => q.label)}
          series={[
            { name: label, values: quarters.map((q) => q.strategy), color: STRAT },
            { name: bhName(cfg), values: quarters.map((q) => q.bench), color: BENCH },
          ]}
        />
      </Card>
    </>
  );
}

/** Holdout ML metrics of a portfolio path, from the logged run metrics (rebalance days, in-index stocks). */
function PortfolioMlCard({ run, label }: { run: MlflowRun; label: string }) {
  const m = (k: string) => metric(run, k);
  const base = m("base_rate");
  const majority = isNum(base) ? Math.max(base, 1 - base) : null;
  const signed = (x: number | null) => (isNum(x) ? (x >= 0 ? "+" : "") + x.toFixed(3) : "–");
  const rows: [string, number | null, number | null, string, (x: number | null) => string][] = [
    ["Precision, pooled", m("rebalance_precision"), base, `base rate ${f3(base)}`, f3],
    ["Precision, per date", m("rebalance_precision_cross_sectional"), base, `base rate ${f3(base)}`, f3],
    ["Recall, per date", m("recall_cross_sectional"), null, "–", f3],
    ["Accuracy, per date", m("accuracy_cross_sectional"), majority, `majority guess ${f3(majority)}`, f3],
    ["IC, per date", m("ic_cross_sectional"), 0, "0", signed],
    ["AUC, pooled", m("rebalance_auc"), 0.5, "random 0.500", f3],
    ["AUC, per date", m("auc_cross_sectional"), 0.5, "random 0.500", f3],
  ];
  return (
    <Card
      title="ML metrics"
      sub="Rebalance days, stocks in the index on that date. Per date = across stocks on each rebalance date, then averaged. Green / red = above / below the reference."
      source={`${run.name} metrics`}
    >
      <table className={c.table}>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">{label}</th>
            <th scope="col">Reference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, v, ref, refText, f]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className={isNum(ref) ? verdict(v, ref, "higher") : ""}>{f(v)}</td>
              <td>{refText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ------------------------------ 2. Settings tried ------------------------------ */

function SettingsView({ cfg, data, mode }: { cfg: PathConfig; data: PathResults; mode: Mode }) {
  const s = data.settings;
  if (!s.length) return <EmptyState title="No in-sample runs found for this path." />;
  const chosen = data.chosen;
  const base = chosen ? metric(chosen.run, "base_rate") : null;
  const quarters = s[0].folds.map((f) => f.label);
  const showAuc = hasAuc(s);
  const showCs = s.some((r) => r.folds.some((f) => isNum(f.icCs) || isNum(f.aucCs)));
  const portfolio = cfg.kind === "portfolio";
  const rocs = s.map((r, i) => ({ name: r.label, points: r.daily ? decisionMetrics(r.daily).roc : [], color: SERIES[i % 5], bold: r.chosen })).filter((x) => x.points.length);
  return (
    <>
      <p className={c.lead}>
        Every {cfg.setting.name.toLowerCase()} side by side, on the same {quarters.length} folds. Precision is scored on rebalance decisions.
      </p>
      <Card title="All settings" source={`${cfg.setting.param} runs: metrics, ${cfg.artifacts.mlPerFold}, ${cfg.artifacts.quantPerFold}`}>
        <div className={c.scroll}>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">{cfg.setting.name}</th>
                <th scope="col">Precision (all decisions)</th>
                <th scope="col">Precision per fold [95% CI]</th>
                <th scope="col">Lower bound</th>
                <th scope="col">{portfolio ? "IC per date (run)" : "IC (all decisions)"}</th>
                <th scope="col">Mean fold IC [95% CI]</th>
                {showAuc && <th scope="col">Mean fold AUC [95% CI]</th>}
                {showCs && <th scope="col">Mean fold IC per date [95% CI]</th>}
                {showCs && <th scope="col">Mean fold AUC per date [95% CI]</th>}
                <th scope="col">Mean fold PnL [95% CI]</th>
                <th scope="col">Sharpe</th>
                <th scope="col">Max DD</th>
                <th scope="col">Trades</th>
                <th scope="col">Exposure</th>
              </tr>
            </thead>
            <tbody>
              {s.map((r) => {
                const p = tCI(r.folds.map((f) => f.precision));
                const q = tCI(r.folds.map((f) => f.pnl));
                const fic = tCI(r.folds.map((f) => f.ic));
                const fauc = tCI(r.folds.map((f) => f.auc));
                const ic = portfolio ? (metric(r.run, "ic_cross_sectional") ?? NaN) : r.daily ? decisionMetrics(r.daily).ic : NaN;
                const icCs = tCI(r.folds.map((f) => f.icCs));
                const aucCs = tCI(r.folds.map((f) => f.aucCs));
                return (
                  <tr key={r.run.run_id} className={r.chosen ? c.chosenRow : undefined}>
                    <td>
                      {r.label} {r.chosen && <span className={c.pill}>chosen</span>}
                    </td>
                    <td>{f3(metric(r.run, "rebalance_precision"))}</td>
                    <td>
                      {f3(p.m)} [{f3(p.lo)}, {f3(p.hi)}]
                    </td>
                    <td>{f3(p.lo)}</td>
                    <td className={isNum(ic) ? (ic > 0 ? c.good : c.bad) : ""}>{sg(ic)}</td>
                    <td className={c.muted}>
                      {sg(fic.m)} [{sg(fic.lo)}, {sg(fic.hi)}]
                    </td>
                    {showAuc && (
                      <td className={isNum(fauc.m) ? (fauc.m > 0.5 ? c.good : c.bad) : ""}>
                        {f3(fauc.m)} [{f3(fauc.lo)}, {f3(fauc.hi)}]
                      </td>
                    )}
                    {showCs && (
                      <td className={isNum(icCs.m) ? (icCs.m > 0 ? c.good : c.bad) : ""}>
                        {sg(icCs.m)} [{sg(icCs.lo)}, {sg(icCs.hi)}]
                      </td>
                    )}
                    {showCs && (
                      <td className={isNum(aucCs.m) ? (aucCs.m > 0.5 ? c.good : c.bad) : ""}>
                        {f3(aucCs.m)} [{f3(aucCs.lo)}, {f3(aucCs.hi)}]
                      </td>
                    )}
                    <td>
                      {pct(q.m)} [{pct(q.lo)}, {pct(q.hi)}]
                    </td>
                    <td>{f2(metric(r.run, "sharpe", mode))}</td>
                    <td>{pct(metric(r.run, "max_drawdown"))}</td>
                    <td>{metric(r.run, "n_trades") ?? "–"}</td>
                    <td>{pct(metric(r.run, "exposure"), 0)}</td>
                  </tr>
                );
              })}
              {chosen && (
                <tr>
                  <td className={c.muted}>{bhName(cfg)}</td>
                  <td>base rate {f3(base)}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td>{f2(metric(chosen.run, "bh_sharpe"))}</td>
                  <td>{pct(metric(chosen.run, "bh_max_drawdown"))}</td>
                  <td>–</td>
                  <td>100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className={c.two}>
        <Card title="Precision by setting" sub="Mean ± 95% CI over folds. Dashed line = base rate." source={`${cfg.artifacts.mlPerFold} → precision`}>
          <CIChart rows={s.map((r, i) => ({ label: r.label, values: r.folds.map((f) => f.precision), color: SERIES[i % 5], bold: r.chosen }))} reference={base} referenceLabel={`base rate ${f3(base)}`} />
        </Card>
        <Card title="PnL per fold" sub="Box = spread across folds; red dot and bar = mean ± 95% CI. Net of costs." source={`${cfg.artifacts.quantPerFold} → pnl`}>
          <BoxCI groups={s.map((r, i) => ({ label: r.label, values: r.folds.map((f) => f.pnl), color: SERIES[i % 5], bold: r.chosen }))} />
        </Card>
      </div>
      {showCs && (
        <div className={c.two}>
          <Card title="IC per date, by setting" sub="Across stocks on each rebalance date, averaged per fold. Mean ± 95% CI over folds. Dashed line = 0." source={`${cfg.artifacts.mlPerFold} → ic_cross_sectional`}>
            <CIChart rows={s.map((r, i) => ({ label: r.label, values: r.folds.map((f) => f.icCs), color: SERIES[i % 5], bold: r.chosen }))} reference={0} referenceLabel="0" />
          </Card>
          <Card title="AUC per date, by setting" sub="Across stocks on each rebalance date, averaged per fold. Mean ± 95% CI over folds. Dashed line = random (0.5)." source={`${cfg.artifacts.mlPerFold} → auc_cross_sectional`}>
            <CIChart rows={s.map((r, i) => ({ label: r.label, values: r.folds.map((f) => f.aucCs), color: SERIES[i % 5], bold: r.chosen }))} reference={0.5} referenceLabel="random 0.5" />
          </Card>
        </div>
      )}
      {(showAuc || rocs.length > 0) && (
        <div className={c.two}>
          {showAuc && (
            <Card title="AUC by setting" sub="Mean ± 95% CI over folds. Dashed line = random (0.5)." source={`${cfg.artifacts.mlPerFold} → auc`}>
              <CIChart rows={s.map((r, i) => ({ label: r.label, values: r.folds.map((f) => f.auc), color: SERIES[i % 5], bold: r.chosen }))} reference={0.5} referenceLabel="random 0.5" />
            </Card>
          )}
          {rocs.length > 0 && (
            <Card title="ROC curves" sub="Rebalance decisions, all folds. Dashed diagonal = random." source={`${cfg.artifacts.daily} → score`}>
              <Legend items={rocs.map((r) => ({ label: r.name, color: r.color }))} />
              <RocChart series={rocs} />
            </Card>
          )}
        </div>
      )}
      <div className={c.two}>
        <Card title="Sharpe per fold" sub="Box = spread across folds; red dot and bar = mean ± 95% CI." source={`${cfg.artifacts.quantPerFold} → sharpe`}>
          <BoxCI groups={s.map((r, i) => ({ label: r.label, values: r.folds.map((f) => f.sharpe), color: SERIES[i % 5], bold: r.chosen }))} fmt={(x) => x.toFixed(0)} valueFmt={(x) => x.toFixed(2)} />
        </Card>
        <Card title="PnL heatmap" sub="Setting × fold. A row that stays green is stable." source={`${cfg.artifacts.quantPerFold} → pnl`}>
          <Heatmap columns={quarters} rows={s.map((r) => ({ label: r.label, values: r.folds.map((f) => f.pnl), bold: r.chosen }))} />
        </Card>
      </div>
      <SignalScatterCard cfg={cfg} settings={s} />
      <ConditionalCard settings={s} />
      {cfg.kind !== "portfolio" && <NotComputed title="Sharpe bootstrap CI and HAC CI on mean daily return">Planned from the multi-stock baseline onward.</NotComputed>}
    </>
  );
}

/** One panel per setting: precision (or IC) against fold PnL (or Sharpe), with the mean ± 95% CI cross. */
function SignalScatterCard({ cfg, settings }: { cfg: PathConfig; settings: SettingResult[] }) {
  const [outcome, setOutcome] = useState<"pnl" | "sharpe">("pnl");
  const rowsDef: { key: "precision" | "ic" | "auc"; name: string }[] = [
    { key: "precision", name: "Precision" },
    { key: "ic", name: "IC" },
    ...(hasAuc(settings) ? [{ key: "auc" as const, name: "AUC" }] : []),
  ];
  const yFmt = outcome === "pnl" ? (y: number) => pct(y, 0) : (y: number) => y.toFixed(1);
  const yName = outcome === "pnl" ? "PnL" : "Sharpe";
  return (
    <Card
      title={`Signal vs ${yName} per fold, each setting`}
      sub={`Faint dots = folds; cross = mean ± 95% CI (t, n = folds). Dashed lines: ${yName} = 0, and the base rate (precision) or IC = 0. ρ = correlation across folds.`}
      source={`${cfg.artifacts.mlPerFold} + ${cfg.artifacts.quantPerFold}`}
    >
      <span className={c.seg} role="radiogroup" aria-label="Outcome" style={{ marginBottom: 10 }}>
        {(["pnl", "sharpe"] as const).map((o) => (
          <button key={o} type="button" role="radio" aria-checked={outcome === o} onClick={() => setOutcome(o)}>
            {o === "pnl" ? "PnL" : "Sharpe"}
          </button>
        ))}
      </span>
      {rowsDef.map((rd) => (
        <div key={rd.key} className={c.smallMultiples}>
          {settings.map((r, i) => {
            const base = metric(r.run, "base_rate") ?? 0.5;
            const pts = r.folds
              .map((f) => ({ x: f[rd.key], y: outcome === "pnl" ? f.pnl : f.sharpe, label: f.label }))
              .filter((p): p is { x: number; y: number; label: string } => isNum(p.x) && isNum(p.y));
            const cx = tCI(pts.map((p) => p.x));
            const cy = tCI(pts.map((p) => p.y));
            const rho = pts.length > 3 ? corr(pts.map((p) => p.x), pts.map((p) => p.y)) : NaN;
            return (
              <div key={r.run.run_id} className={`${c.mini} ${r.chosen ? c.miniChosen : ""}`} style={r.chosen ? { borderColor: SERIES[i % 5] } : undefined}>
                <p className={c.miniTitle}>
                  {r.label}
                  {r.chosen ? " (chosen)" : ""} · ρ = {f2(rho)} · n = {pts.length}
                </p>
                <p className={c.miniSub}>
                  {rd.name} {f2(cx.m)} ± {f2(cx.hi - cx.m)} · {yName} {yFmt(cy.m)} ± {yFmt(cy.hi - cy.m)}
                </p>
                <FoldScatter points={pts} color={SERIES[i % 5]} bold={r.chosen} xRef={rd.key === "precision" ? base : rd.key === "auc" ? 0.5 : 0} yFmt={yFmt} />
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

/** P(PnL good | signal good) per setting, for precision and for IC, with 95% Wilson CIs. */
function ConditionalCard({ settings }: { settings: SettingResult[] }) {
  const cell = (w: { p: number; lo: number; hi: number; k: number; n: number }, strong = false) => (
    <td title={`${w.k} of ${w.n} folds`} className={strong ? c.strongCell : undefined}>
      {pct(w.p, 0)} <span className={c.muted}>[{pct(w.lo, 0)}, {pct(w.hi, 0)}]</span>
    </td>
  );
  return (
    <Card
      title="Conditional probabilities"
      sub="Does a good signal lead to a profitable fold? Precision good = above that fold's base rate; IC good = fold IC above 0; AUC good (when logged) = fold AUC above 0.5; PnL good = fold PnL above 0. 95% Wilson CIs. Folds missing a value are left out."
      source="fold tables: precision, base_rate, ic_spearman, pnl"
    >
      {(hasAuc(settings) ? (["precision", "ic", "auc"] as const) : (["precision", "ic"] as const)).map((sig) => {
        const rows = settings.map((r) => ({ r, p: conditionalProbabilities(r.folds, sig) }));
        const top = Math.max(...rows.map((x) => (isNum(x.p.pnlGivenGood.p) ? x.p.pnlGivenGood.p : -1)));
        const name = sig === "precision" ? "precision" : sig === "ic" ? "IC" : "AUC";
        return (
          <div key={sig} className={c.scroll} style={{ marginBottom: 12 }}>
            <p className={c.miniTitle}>{sig === "precision" ? "Precision → PnL" : sig === "ic" ? "IC → PnL" : "AUC → PnL"}</p>
            <table className={c.table}>
              <thead>
                <tr>
                  <th scope="col">Setting</th>
                  <th scope="col">Folds with {name} good</th>
                  <th scope="col">P(PnL good | {name} good)</th>
                  <th scope="col">P(PnL good | {name} bad)</th>
                  <th scope="col">P({name} good)</th>
                  <th scope="col">P(both good)</th>
                  <th scope="col">P(PnL good), all folds</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ r, p }) => (
                  <tr key={r.run.run_id} className={r.chosen ? c.chosenRow : undefined}>
                    <td>
                      {r.label} {r.chosen && <span className={c.pill}>chosen</span>}{" "}
                      {p.pnlGivenGood.p === top && <span className={c.pillGood}>highest</span>}
                    </td>
                    <td>
                      {p.signalGood.k} of {p.folds}
                      {p.skipped ? <span className={c.muted}> ({p.skipped} left out)</span> : null}
                    </td>
                    {cell(p.pnlGivenGood, true)}
                    {cell(p.pnlGivenBad)}
                    {cell(p.signalGood)}
                    {cell(p.bothGood)}
                    {cell(p.pnlGood)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </Card>
  );
}

/* ------------------------------ 3. The choice ------------------------------ */

function ChoiceView({ cfg, data }: { cfg: PathConfig; data: PathResults }) {
  const ch = data.chosen;
  if (!ch) return <EmptyState title="No setting has been chosen yet (no run tagged chosen=true)." />;
  const byLowerBound = [...data.settings].sort((a, b) => (tCI(b.folds.map((f) => f.precision)).lo || -1) - (tCI(a.folds.map((f) => f.precision)).lo || -1));
  const agrees = byLowerBound[0]?.run.run_id === ch.run.run_id;
  return (
    <>
      <p className={c.lead}>Which setting was frozen, and why.</p>
      <div className={c.tiles}>
        <div className={c.tile}>
          <span>Chosen</span>
          <b>{ch.label}</b>
          <em>frozen {ch.run.tags.frozen_on ?? "–"}</em>
        </div>
        <div className={c.tile}>
          <span>Settings tried</span>
          <b>{ch.run.tags.settings_tried ?? data.settings.length}</b>
          <em>for the ×k correction of p-values</em>
        </div>
        <div className={c.tile}>
          <span>Rule fixed in advance</span>
          <b className={cfg.notes.ruleFixedInAdvance ? c.good : c.bad}>{cfg.notes.ruleFixedInAdvance ? "Yes" : "No"}</b>
          <em>recorded honestly</em>
        </div>
        <div className={c.tile}>
          <span>Highest precision lower bound</span>
          <b>{byLowerBound[0]?.label ?? "–"}</b>
          <em>
            would that rule agree? <span className={agrees ? c.good : c.bad}>{agrees ? "yes" : "no"}</span>
          </em>
        </div>
      </div>
      <div className={c.reason}>
        <b>Reason (tag selection_reason):</b> {ch.run.tags.selection_reason ?? "Not recorded."}
      </div>
      <Source>{ch.run.name} tags: chosen, frozen_on, settings_tried, selection_reason</Source>
      {CHOICE_PARTS.map((part, i) => {
        const content = cfg.notes.choice?.parts[i];
        return (
          <section key={part.title} className={c.choicePart}>
            <h3 className={c.choicePartTitle}>
              <span className={c.choicePartNum}>{i + 1}</span>
              {part.title}
            </h3>
            <p className={c.cardSub}>{part.sub}</p>
            {content && cfg.notes.choice ? (
              <>
                <ChoiceTableView table={content} pick={cfg.notes.choice.pick} />
                <dl className={c.verdict}>
                  <div>
                    <dt>Best candidates</dt>
                    <dd>{content.candidates}</dd>
                  </div>
                  <div>
                    <dt>Provisional pick</dt>
                    <dd>
                      <b>{content.pick}</b>
                    </dd>
                  </div>
                  <div>
                    <dt>Decision</dt>
                    <dd>{content.decision}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className={c.choicePartEmpty}>Coming next.</div>
            )}
          </section>
        );
      })}
      {cfg.notes.choice && (
        <section className={c.choicePart}>
          <h3 className={c.choicePartTitle}>
            <span className={`${c.choicePartNum} ${c.choicePartNumFinal}`}>✓</span>
            Final selection
          </h3>
          <p className={c.cardSub}>The three decisions side by side.</p>
          <ChoiceTableView table={cfg.notes.choice.final} pick={cfg.notes.choice.pick} final />
          <dl className={c.verdict}>
            <div>
              <dt>Why {cfg.notes.choice.pick}</dt>
              <dd>{cfg.notes.choice.final.why}</dd>
            </div>
            <div>
              <dt>Caveats</dt>
              <dd>{cfg.notes.choice.final.caveats}</dd>
            </div>
          </dl>
          <Source>All numbers are in sample, from {cfg.notes.choice.source}.</Source>
        </section>
      )}
    </>
  );
}

/** One table of The choice. A tick marks cells (in tickCols) won by the chosen setting. */
function ChoiceTableView({ table, pick, final }: { table: ChoiceTable; pick: string; final?: boolean }) {
  const last = table.columns.length - 1;
  return (
    <div className={c.scroll}>
      <table className={`${c.table} ${c.choiceTable}`}>
        <thead>
          <tr>
            {table.columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className={final && r === table.rows.length - 1 ? c.chosenRow : undefined}>
              {row.map((cell, j) => {
                const ticked = table.tickCols.includes(j) && cell.startsWith(pick);
                const strength = final && j === last ? cell.match(/^(Weak|Moderate|Strong)(?::\s*(.*))?$/) : null;
                return (
                  <td key={j} className={j === 0 && !final ? c.stepCell : undefined}>
                    {ticked && <span className={c.tick}>✓</span>}
                    {strength ? (
                      <>
                        <span className={strength[1] === "Weak" ? c.pillWeak : c.pillGood}>{strength[1]}</span>
                        {strength[2] && <span className={c.muted}> {strength[2]}</span>}
                      </>
                    ) : (
                      <span className={ticked ? c.strongCell : undefined}>{cell}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The three steps of the choice. Each path's content comes from notes.choice. */
const CHOICE_PARTS = [
  { title: "Machine learning metrics: analysis and decision", sub: "What the prediction metrics say about each setting, and the decision they lead to." },
  { title: "Quant metrics: analysis and decision", sub: "What the trading metrics say about each setting, and the decision they lead to." },
  { title: "Combined metrics: analysis and decision", sub: "Prediction and trading metrics together, and the final choice." },
];

/* ------------------------------ 4. In sample ------------------------------ */

function InSampleView({ cfg, data, mode }: { cfg: PathConfig; data: PathResults; mode: Mode }) {
  const ch = data.chosen;
  const d = data.chosenDaily;
  if (!ch || !d) return <EmptyState title="The chosen setting's daily results aren't available." />;
  const cv = curves(d, mode);
  const quarters = periodReturns(d, ch.folds, mode);
  return (
    <>
      <p className={c.lead}>
        The frozen {ch.label} only, {d.dates[0]} → {d.dates[d.dates.length - 1]}, {mode === "net" ? "net of costs" : "gross"}.
      </p>
      <div className={c.twoOne}>
        <Card title="Equity and drawdown" source={`${ch.run.name} → ${cfg.artifacts.daily}`}>
          <Legend
            items={[
              { label: ch.label, color: STRAT },
              { label: cfg.benchmark, color: BENCH, dashed: true },
            ]}
          />
          <EquityChart
            height={620}
            dates={d.dates}
            series={[
              { name: ch.label, values: cv.equity, color: STRAT },
              { name: cfg.benchmark, values: cv.benchEquity, color: BENCH, dashed: true },
            ]}
            drawdowns={[
              { name: ch.label, values: cv.dd, color: STRAT },
              { name: cfg.benchmark, values: cv.benchDd, color: BENCH, dashed: true },
            ]}
          />
        </Card>
        <Card title="Quant metrics" source={`${ch.run.name} metrics`}>
          <QuantTable run={ch.run} label={ch.label} mode={mode} benchmark={bhName(cfg)} />
        </Card>
      </div>
      <Card title="PnL per fold" source={`${ch.run.name} → ${cfg.artifacts.daily}`}>
        <Legend
          items={[
            { label: ch.label, color: STRAT },
            { label: bhName(cfg), color: BENCH },
          ]}
        />
        <GroupBars
          labels={quarters.map((q) => q.label)}
          series={[
            { name: ch.label, values: quarters.map((q) => q.strategy), color: STRAT },
            { name: bhName(cfg), values: quarters.map((q) => q.bench), color: BENCH },
          ]}
        />
      </Card>
      <div className={c.two}>
        <Card title="Per calendar year" sub="Net of costs. No CI (one value per year)." source={cfg.artifacts.yearly}>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Return</th>
                <th scope="col">Sharpe</th>
                <th scope="col">Max DD</th>
              </tr>
            </thead>
            <tbody>
              {data.chosenYearly.map((y) => {
                const r = y.return as number | null;
                return (
                  <tr key={String(y.year)}>
                    <td>{String(y.year)}</td>
                    <td className={isNum(r) ? (r >= 0 ? c.good : c.bad) : ""}>{pct(r)}</td>
                    <td>{f2(y.sharpe as number | null)}</td>
                    <td>{pct(y.max_drawdown as number | null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <Card title="Tests and robustness">
          <table className={`${c.table} ${c.wrap}`}>
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Status</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fold Sharpe 95% CI</td>
                <td>
                  <span className={c.pillGood}>run</span>
                </td>
                <td>
                  [{f2(tCI(ch.folds.map((f) => f.sharpe)).lo)}, {f2(tCI(ch.folds.map((f) => f.sharpe)).hi)}]
                </td>
              </tr>
              {cfg.notes.tests.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td>
                    <span className={t.status === "run" ? c.pillGood : c.pill}>{t.status}</span>
                  </td>
                  <td>{t.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className={c.two}>
        <NotComputed title="Excess return over Nifty Midcap 150">Needs the index level; this path compares with {cfg.benchmark}.</NotComputed>
        <NotComputed title="Return by rank bucket and number of stocks N*">Multi-stock paths only.</NotComputed>
      </div>
    </>
  );
}

/* ------------------------------ 5–6. Findings, About ------------------------------ */

function FindingsView({ cfg }: { cfg: PathConfig }) {
  return (
    <Card title="Findings" sub={`From ${cfg.notes.findingsSource}.`}>
      <ul className={c.findings}>
        {cfg.notes.findings.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </Card>
  );
}

function AboutView({ cfg, data }: { cfg: PathConfig; data: PathResults }) {
  const configTag = cfg.configTag ?? "config";
  const config = parseConfigTag(data.experiment?.tags[configTag]);
  return (
    <div className={c.two}>
      <Card title="Setup" source="written with this path's dashboard settings">
        <dl className={c.kv}>
          {cfg.notes.setup.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card title="MLflow config tag" sub="As logged in the notebook." source={`experiment ${cfg.source?.experiment} → tag ${configTag}`}>
        {config ? (
          <dl className={c.kv}>
            {Object.entries(config).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={c.muted}>{data.experiment?.tags[configTag] ?? "Not logged."}</p>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ Shell ------------------------------ */

const VIEWS: { id: View; label: (chosen: string) => string }[] = [
  { id: "holdout", label: () => "Holdout results" },
  { id: "settings", label: () => "Settings tried" },
  { id: "choice", label: () => "The choice" },
  { id: "insample", label: (ch) => `${ch} in sample` },
  { id: "findings", label: () => "Findings" },
  { id: "about", label: () => "About this path" },
];

function PathBody({ experiment, section, cfg, mode, snapshot }: { experiment: string; section: string; cfg: PathConfig; mode: Mode; snapshot?: Snapshot }) {
  const { data, loading, error, refreshing, reload, refresh } = usePathResults(experiment, section, cfg, snapshot);
  const [view, setView] = useState<View>("holdout");
  if (!cfg.source) return <EmptyState title={`${cfg.title} hasn't been run yet.`} />;
  if (error)
    return (
      <EmptyState title="The results couldn't be loaded." action={<Button onClick={() => void reload()}>Try again</Button>}>
        <p>{error}</p>
      </EmptyState>
    );
  if (!data) return <GearSpinner label="Loading results from MLflow…" />;
  return (
    <>
      <div className={c.views} role="tablist" aria-label="Result sections">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={c.viewBtn} onClick={() => setView(v.id)}>
            {v.label(data.chosen?.label ?? "Chosen")}
          </button>
        ))}
        {!snapshot && (
          <span className={c.viewsEnd}>
            <Button onClick={() => void refresh()} disabled={refreshing} title="Fetch this path's results from the server again and update the browser's copy">
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </Button>
          </span>
        )}
      </div>
      <div className={c.body}>
        {mode === "gross" && !(data.holdout?.daily ?? data.chosenDaily)?.hasGross && (
          <p className={c.tableNote}>Gross daily returns aren&apos;t logged for this path yet: charts show net of costs; tables show gross where the metric is logged.</p>
        )}
        {view === "holdout" && <HoldoutView cfg={cfg} data={data} mode={mode} />}
        {view === "settings" && <SettingsView cfg={cfg} data={data} mode={mode} />}
        {view === "choice" && <ChoiceView cfg={cfg} data={data} />}
        {view === "insample" && <InSampleView cfg={cfg} data={data} mode={mode} />}
        {view === "findings" && <FindingsView cfg={cfg} />}
        {view === "about" && <AboutView cfg={cfg} data={data} />}
        {cfg.extras?.map((name) => {
          // Extra components switched on per path in paths.ts; each is defined once in extras.tsx.
          const extra = EXTRAS[name];
          return extra && extra.views.includes(view) ? <extra.Component key={name} cfg={cfg} data={data} mode={mode} view={view} /> : null;
        })}
      </div>
    </>
  );
}

/** The results dashboard. With `snapshot` (a share link) it shows one frozen path, read-only, with no Share button. */
export function ResultsView({ experiment, section, paths, snapshot }: { experiment: string; section: string; paths: PathConfig[]; snapshot?: Snapshot }) {
  const [pathId, setPathId] = useState(paths.find((p) => p.source)?.id ?? paths[0]?.id);
  const [mode, setMode] = useState<Mode>("net");
  const cfg = paths.find((p) => p.id === pathId) ?? paths[0];
  if (!cfg) return null;
  return (
    <Panel
      flush
      title={
        <span className={c.paths} role="tablist" aria-label="Research paths">
          {paths.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={p.id === cfg.id} disabled={!p.source} className={c.pathBtn} onClick={() => setPathId(p.id)}>
              {p.title}
              <span className={c.badge}>{p.tag}</span>
            </button>
          ))}
        </span>
      }
      actions={
        <span className={c.headActions}>
          <span className={c.seg} role="radiogroup" aria-label="Returns">
            {(["net", "gross"] as Mode[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>
                {m === "net" ? "Net of costs" : "Gross"}
              </button>
            ))}
          </span>
          {!snapshot && cfg.source && <ShareButton experiment={experiment} section={section} path={cfg} />}
        </span>
      }
    >
      <PathBody key={cfg.id} experiment={experiment} section={section} cfg={cfg} mode={mode} snapshot={snapshot} />
    </Panel>
  );
}
