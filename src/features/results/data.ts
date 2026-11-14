"use client";

// Loads one path's MLflow results from the server (which reads the pushed zip) and derives
// what the dashboard draws. Nothing is computed on the server; summaries are worked out here.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { useLedger } from "@/data/LedgerProvider";
import { drawdown, equityFromLog, isNum, periodReturn, spearman, wilson } from "./stats";
import type { MlflowExperiment, MlflowRun, PathConfig, Row } from "./types";

const num = (x: unknown): number | null => (isNum(x) ? x : null);

/** log_table JSON ({columns, data}) -> rows. Anything else -> []. */
export function tableRows(json: unknown): Row[] {
  const t = json as { columns?: string[]; data?: unknown[][] } | null;
  if (!t || !Array.isArray(t.columns) || !Array.isArray(t.data)) return [];
  const cols = t.columns;
  return t.data.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

export interface Fold {
  fold: string; // "2018-01-01 - 2018-03-28"
  start: string;
  end: string;
  label: string; // "2018-Q1"
  precision: number | null;
  ic: number | null;
  baseRate: number | null;
  signals: number | null;
  pnl: number | null;
  sharpe: number | null;
  maxDrawdown: number | null;
}

function foldLabel(start: string): string {
  const y = start.slice(0, 4);
  const q = Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

export function joinFolds(ml: Row[], quant: Row[]): Fold[] {
  const byFold = new Map(quant.map((q) => [String(q.fold), q]));
  return ml.map((m) => {
    const q = byFold.get(String(m.fold)) ?? {};
    const [start, end] = String(m.fold).split(" - ");
    return {
      fold: String(m.fold),
      start,
      end,
      label: foldLabel(start),
      precision: num(m.precision),
      ic: num(m.ic_spearman),
      baseRate: num(m.base_rate),
      signals: num(m.n_signals),
      pnl: num(q.pnl),
      sharpe: num(q.sharpe),
      maxDrawdown: num(q.max_drawdown),
    };
  });
}

export interface Daily {
  dates: string[];
  net: number[]; // daily log returns after costs
  gross: number[];
  bench: number[]; // buy-and-hold daily log returns
  positions: number[];
  close: number[];
  signal: (number | null)[];
  prediction: (number | null)[];
  rebalance: boolean[];
}

export function toDaily(rows: Row[]): Daily {
  const z = (x: unknown) => num(x) ?? 0;
  return {
    dates: rows.map((r) => String(r.datetime).slice(0, 10)),
    net: rows.map((r) => z(r.strategy_returns_tc)),
    gross: rows.map((r) => z(r.strategy_returns)),
    bench: rows.map((r) => z(r.log_returns)),
    positions: rows.map((r) => z(r.positions)),
    close: rows.map((r) => z(r.close)),
    signal: rows.map((r) => num(r.backward_signal)),
    prediction: rows.map((r) => num(r.predictions)),
    rebalance: rows.map((r) => Number(r.is_rebalance_date) === 1),
  };
}

export interface Curves {
  equity: number[];
  dd: number[];
  benchEquity: number[];
  benchDd: number[];
}

export function curves(d: Daily, mode: "net" | "gross"): Curves {
  const equity = equityFromLog(mode === "net" ? d.net : d.gross);
  const benchEquity = equityFromLog(d.bench);
  return { equity, dd: drawdown(equity), benchEquity, benchDd: drawdown(benchEquity) };
}

/** Compounded return per fold window, for the strategy and buy-and-hold. */
export function periodReturns(d: Daily, folds: Fold[], mode: "net" | "gross") {
  const r = mode === "net" ? d.net : d.gross;
  return folds.map((f) => {
    const idx = d.dates.map((x, i) => (x >= f.start && x <= f.end ? i : -1)).filter((i) => i >= 0);
    return { label: f.label, strategy: periodReturn(idx.map((i) => r[i])), bench: periodReturn(idx.map((i) => d.bench[i])) };
  });
}

/** Rebalance decisions: the call on each rebalance date, scored on the return until the next rebalance.
 *  The last rebalance has no next one and is left out (matches how the notebooks log precision). */
export function decisionMetrics(d: Daily) {
  const at = d.rebalance.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  const dec = at.slice(0, -1).map((i, k) => {
    const fwd = d.close[at[k + 1]] / d.close[i] - 1;
    return { pred: d.prediction[i] ?? 0, actual: fwd > 0 ? 1 : 0, signal: d.signal[i], fwd };
  });
  const tp = dec.filter((x) => x.pred === 1 && x.actual === 1).length;
  const longs = dec.filter((x) => x.pred === 1).length;
  const ups = dec.filter((x) => x.actual === 1).length;
  const withSignal = dec.filter((x) => isNum(x.signal));
  return {
    decisions: dec.length,
    longs,
    precision: longs ? tp / longs : NaN,
    recall: ups ? tp / ups : NaN,
    accuracy: dec.length ? dec.filter((x) => x.pred === x.actual).length / dec.length : NaN,
    baseRate: dec.length ? ups / dec.length : NaN,
    ic: withSignal.length > 3 ? spearman(withSignal.map((x) => x.signal as number), withSignal.map((x) => x.fwd)) : NaN,
  };
}

/** The experiment's "config" tag is a Python dict printed as text; read what we can. */
export function parseConfigTag(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const json = text
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface SettingResult {
  run: MlflowRun;
  value: string; // the setting, e.g. "22"
  label: string; // "22d"
  chosen: boolean;
  folds: Fold[];
  daily: Daily | null;
}

/** Conditional view across folds, for one signal (precision or IC) against fold PnL.
 *  Signal good: precision above that fold's base rate, or fold IC above 0. PnL good: fold PnL above 0.
 *  Folds missing a value (e.g. no long calls) are left out. Every share has a 95% Wilson CI. */
export function conditionalProbabilities(folds: Fold[], signal: "precision" | "ic") {
  const good = (f: Fold) => (signal === "precision" ? (f.precision as number) > (f.baseRate as number) : (f.ic as number) > 0);
  const used = folds.filter((f) => isNum(f.pnl) && (signal === "precision" ? isNum(f.precision) && isNum(f.baseRate) : isNum(f.ic)));
  const sg = used.filter(good);
  const sb = used.filter((f) => !good(f));
  const win = (a: Fold[]) => a.filter((f) => (f.pnl as number) > 0).length;
  return {
    folds: used.length,
    skipped: folds.length - used.length,
    signalGood: wilson(sg.length, used.length),
    pnlGivenGood: wilson(win(sg), sg.length),
    pnlGivenBad: wilson(win(sb), sb.length),
    pnlGood: wilson(win(used), used.length),
    bothGood: wilson(win(sg), used.length),
  };
}

export interface PathResults {
  experiment: MlflowExperiment | null;
  settings: SettingResult[]; // in-sample runs, in setting order
  chosen: SettingResult | null;
  chosenDaily: Daily | null;
  chosenYearly: Row[];
  holdout: { run: MlflowRun; folds: Fold[]; daily: Daily } | null;
}

/** Loads everything one path's dashboard shows. Runs first (so the server unzips once), then the tables. */
export function usePathResults(experiment: string, section: string, cfg: PathConfig) {
  const { server } = useLedger();
  const [data, setData] = useState<PathResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cfg.source) return;
    setLoading(true);
    setError(null);
    try {
      const base = `/experiments/${experiment}/sections/${section}/mlflow/${encodeURIComponent(cfg.source.zip)}/latest`;
      const runs = await apiRequest<MlflowRun[]>(`${base}/experiments/${encodeURIComponent(cfg.source.experiment)}/runs`);
      const exps = await apiRequest<MlflowExperiment[]>(`${base}/experiments`);
      const art = (run: MlflowRun, file: string | undefined) =>
        file && run.artifacts.some((a) => a.path === file)
          ? apiRequest<unknown>(`${base}/runs/${run.run_id}/artifacts/${encodeURIComponent(file)}`).then(tableRows)
          : Promise.resolve([] as Row[]);

      const inSample = runs
        .filter((r) => r.tags.stage === "in_sample" && r.params[cfg.setting.param] !== undefined)
        .sort((a, b) => Number(a.params[cfg.setting.param]) - Number(b.params[cfg.setting.param]));
      const holdoutRun = runs.find((r) => r.tags.stage === "holdout") ?? null;
      const chosenRun = inSample.find((r) => r.tags.chosen === "true") ?? null;

      const settings = await Promise.all(
        inSample.map(async (run) => {
          const [ml, quant, daily] = await Promise.all([
            art(run, cfg.artifacts.mlPerFold),
            art(run, cfg.artifacts.quantPerFold),
            art(run, cfg.artifacts.daily),
          ]);
          const value = run.params[cfg.setting.param];
          return {
            run,
            value,
            label: cfg.setting.label(value),
            chosen: run === chosenRun,
            folds: joinFolds(ml, quant),
            daily: daily.length ? toDaily(daily) : null,
          };
        }),
      );
      const chosenYearly = chosenRun ? await art(chosenRun, cfg.artifacts.yearly) : [];
      let holdout: PathResults["holdout"] = null;
      if (holdoutRun) {
        const [ml, quant, daily] = await Promise.all([
          art(holdoutRun, cfg.artifacts.mlPerFold),
          art(holdoutRun, cfg.artifacts.quantPerFold),
          art(holdoutRun, cfg.artifacts.daily),
        ]);
        holdout = { run: holdoutRun, folds: joinFolds(ml, quant), daily: toDaily(daily) };
      }
      setData({
        experiment: exps.find((e) => e.name === cfg.source?.experiment) ?? null,
        settings,
        chosen: settings.find((s) => s.chosen) ?? null,
        chosenDaily: settings.find((s) => s.chosen)?.daily ?? null,
        chosenYearly,
        holdout,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The results couldn't be loaded.");
    } finally {
      setLoading(false);
    }
  }, [experiment, section, cfg]);

  useEffect(() => {
    if (server === "ready" && cfg.source) void load();
  }, [server, cfg.source, load]);

  return { data, loading, error, reload: load };
}
