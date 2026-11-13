// The research paths shown on 05 Baseline Research → Results. One entry per path; a path without
// `source` shows as "Not run". To add a path: push its MLflow zip, then fill in its entry here.
import type { PathConfig } from "@/features/results/types";

const DEFAULT_ARTIFACTS: PathConfig["artifacts"] = {
  mlPerFold: "fold_metrics_rebalance.json",
  quantPerFold: "fold_quant_metrics.json",
  yearly: "yearly_quant_metrics.json",
  daily: "outputs.json",
};

const notRun = (id: string, title: string): PathConfig => ({
  id,
  title,
  tag: "Not run",
  setting: { param: "", name: "Setting", label: (v) => v },
  benchmark: "Buy-and-hold",
  artifacts: DEFAULT_ARTIFACTS,
  notes: { ruleFixedInAdvance: true, setup: [], tests: [], findings: [], findingsSource: "" },
});

export const BASELINE_PATHS: PathConfig[] = [
  {
    id: "path_1",
    title: "Path 1 · Single-stock momentum",
    tag: "Practice",
    source: { zip: "mlflow_path_1.zip", experiment: "single_stock_momentum_baseline" },
    setting: { param: "Momentum_period", name: "Lookback", label: (v) => `${v}d` },
    benchmark: "CRISIL buy-and-hold",
    artifacts: DEFAULT_ARTIFACTS,
    notes: {
      ruleFixedInAdvance: false,
      setup: [
        ["Purpose", "Practice: pipeline, costs and MLflow logging on one stock before the portfolio track."],
        ["Scope", "CRISIL only. Chosen because it stayed in Nifty Midcap 150 throughout (hindsight bias, recorded)."],
        ["Signal", "log(close_t / close_{t−N}) > 0 → long, else flat. No shorting, 100% in one stock."],
        ["Rebalance", "1st and 15th of each month (next trading day), about every 10–11 trading days."],
        ["Costs", "0.15% per side, charged on buy and sell (0.30% round trip)."],
        ["Folds", "Calendar quarters, no training window (the rule doesn't train)."],
        ["Data", "In sample 2018-01-01 → 2025-09-04. Holdout 2025-09-05 → 2026-09-04, run once."],
        ["Note", "The config tag says rebalance every 12 days and 3- and 6-month folds; the code used the 1st/15th and quarters."],
      ],
      tests: [
        { name: "1-day delayed entry", status: "run", result: "22d holds up" },
        { name: "Kruskal-Wallis (PnL by year)", status: "run", result: "p = 0.55 · low power" },
        { name: "Mann-Whitney (up vs down quarters)", status: "run", result: "p = 0.004 · partly circular for long-or-flat" },
        { name: "MCPT (predictive power)", status: "not computed", result: "shuffling across stocks needs many stocks" },
        { name: "Random-entry Monte Carlo (profit)", status: "not computed", result: "planned from the multi-stock baseline" },
        { name: "×5 correction", status: "not computed", result: "no p-values for the lookbacks" },
      ],
      findings: [
        "Direction: no predictive power. Rebalance precision is close to the base rate and the full-sample IC is near zero.",
        "Profit in sample: 12d and 22d beat buy-and-hold after costs, but nothing is proven. 22d's fold PnL and Sharpe CIs include zero, and the result rests on 26 trades.",
        "Where the edge is: trade size. The average win is much larger than the average loss. It is defensive and depends on the regime.",
        "Stability: 22d lost money in 2018, 2020 and 2025.",
        "Holdout: soft fail. It lost 3.6% against buy-and-hold's −4.1%, with lower volatility and drawdown. It protected in falling quarters and lagged in rising ones, because the 2–4-week rallies were about as long as the lookback.",
        "Lesson for the real research: move to the multi-stock portfolio track, and fix the selection rule before looking at results.",
      ],
      findingsSource: "findings.md (Path 1 notebooks)",
    },
  },
  notRun("path_1_multi", "Path 1 · Multi-stock momentum"),
  notRun("path_2", "Path 2 · Ridge"),
  notRun("path_3", "Path 3 · Decision Tree"),
  notRun("xgboost", "XGBoost (final)"),
];
