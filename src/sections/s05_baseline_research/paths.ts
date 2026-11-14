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
      choice: {
        pick: "22d",
        source: "findings.md",
        parts: [
          {
            columns: ["Step", "Metric", "Best", "Runner-up", "Note"],
            tickCols: [2],
            rows: [
              ["1.1", "Daily precision, pooled", "22d (0.554)", "12d (0.548)", "Scores trades never taken; 12-day labels overlap"],
              ["1.2", "Daily precision, fold mean", "1d (0.494)", "5d (0.479)", "Ranks the periods differently from 1.1"],
              ["1.3", "Quarters where 22d beat each other period", "–", "–", "10–16 of ~30 quarters: a coin flip"],
              ["1.4", "Rebalance precision", "22d (0.494)", "1d (0.492)", "Highest lower bound; intervals ~0.25 wide, so a tie"],
              ["1.5", "Rebalance accuracy", "1d (0.52)", "12d (0.51)", "22d third (0.50)"],
              ["1.6", "Fold IC, rebalance days only", "1d (−0.04)", "5d (−0.15)", "Biased below zero, more so for longer lookbacks; favours 1d"],
              ["1.7", "Full-sample IC", "22d (+0.06)", "5d / 12d (+0.03)", "All about 0"],
              ["1.8", "6-month folds (tried, then dropped)", "1d / 12d", "–", "Winner flipped, so stayed with 3-month folds"],
            ],
            candidates: "22d (1.1, 1.4, 1.7) and 1d (1.2, 1.5, 1.6).",
            pick: "22d. It leads on the two most trustworthy measures, rebalance precision and full-sample IC.",
            decision: "The ML metrics cannot separate the periods. Every period is below the 0.53 you'd get by always going long, so none shows directional skill.",
          },
          {
            columns: ["Step", "Metric", "Best", "Runner-up", "Worst"],
            tickCols: [2],
            rows: [
              ["2.1", "Log PnL after costs", "22d (1.24)", "12d (0.97)", "5d (0.29)"],
              ["2.2", "Sharpe", "22d (0.70)", "12d (0.55)", "5d (0.16)"],
              ["2.3", "Sharpe with 1-day entry delay", "22d (0.74)", "12d (0.55)", "5d (0.10)"],
              ["2.4", "Top-3 trades as share of PnL", "22d (66%)", "12d (92%)", "5d (231%)"],
              ["2.5", "Average win / average loss", "22d (0.138 / −0.030)", "12d (0.126 / −0.040)", "–"],
              ["2.6", "Win rate", "63d (50%)", "22d / 1d (46%)", "5d (37%)"],
              ["2.7", "Mean quarterly PnL", "22d (0.051)", "12d (0.044)", "5d (0.019)"],
            ],
            candidates: "22d and 12d. They sit next to each other, so this is a plateau rather than a lone spike.",
            pick: "22d. It is first on 6 of the 7 rows.",
            decision: "1d, 5d and 63d are fragile or weak. 22d vs 12d is a near-tie (0.051 vs 0.044 per quarter, and both confidence intervals touch 0).",
          },
          {
            columns: ["Step", "Analysis", "Best", "Note"],
            tickCols: [2],
            rows: [
              ["3.1", "Correlation of precision with quarterly PnL", "1d (0.82)", "Strong in every period (0.61–0.82): precision drives PnL"],
              ["3.2", "Mean quarterly PnL at average precision", "22d (0.051)", "Converts precision into PnL best"],
              ["3.3", "Worst quarter when every long call was wrong", "22d (−0.139)", "Smallest loss when wrong"],
              ["3.4", "Correlation of IC with quarterly PnL", "1d (0.37)", "IC is a weak companion to PnL; 22d at 0.18"],
            ],
            candidates: "22d on 3.2 and 3.3. 1d leads only on the correlation rows (3.1 and 3.4), which measure how tightly PnL tracks precision or IC, not how much it earns.",
            pick: "22d.",
            decision: "22d earns the most for a given precision and loses the least when wrong.",
          },
        ],
        final: {
          columns: ["Section", "Best candidates", "Provisional pick", "How strong"],
          tickCols: [2],
          rows: [
            ["ML metrics", "22d, 1d", "22d", "Weak: all tied within noise"],
            ["Quant metrics", "22d, 12d", "22d", "Moderate: 12d close behind"],
            ["Combined", "22d", "22d", "Moderate"],
            ["Final", "22d (12d the equal alternative)", "22d", "Best of the five, not proven better than 12d"],
          ],
          why: "It is the provisional pick in all three sections. Nothing beats it on more than a couple of measures, and the tie with 12d is broken by the prior that about one month is the standard momentum window.",
          caveats: "The Sharpe of 0.70 is inflated by picking the best of five periods. The PnL and Sharpe confidence intervals include 0, and the edge over buy & hold is not proven.",
        },
      },
    },
  },
  notRun("path_1_multi", "Path 1 · Multi-stock momentum"),
  notRun("path_2", "Path 2 · Ridge"),
  notRun("path_3", "Path 3 · Decision Tree"),
  notRun("xgboost", "XGBoost (final)"),
];
