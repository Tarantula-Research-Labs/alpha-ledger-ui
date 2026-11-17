// What a results tab needs to know about one research path. Each section (e.g. 05) lists its paths;
// a path with no `source` yet shows as "Not run". Names here are the MLflow names that path logged,
// so later paths with different names only need a new entry, not new code.

export interface PathConfig {
  id: string;
  title: string; // tab label, e.g. "Path 1 · Single-stock momentum"
  tag: string; // small badge, e.g. "Practice"
  /** Where the runs are: the pushed zip and the MLflow experiment inside it. Missing = not run yet. */
  source?: { zip: string; experiment: string };
  /** The setting that differs between in-sample runs, e.g. the momentum lookback. */
  /** The setting that differs between in-sample runs. One param (e.g. Momentum_period), or several
   *  (`params`, e.g. ["C", "l1_ratio"]); with several, `label` gets the values joined with "|". */
  setting: { param: string; params?: string[]; name: string; label: (value: string) => string };
  /** Column of the daily table used as the score for IC, AUC and ROC (default backward_signal for IC, score for AUC). */
  scoreColumn?: string;
  /** Extra components only this path shows (new tests, new CI charts…), by name from the EXTRAS registry
   *  in ResultsView. Every path gets the default template; extras are added on top. */
  extras?: string[];
  benchmark: string; // e.g. "CRISIL buy-and-hold"
  /** "single" (default): one stock, daily rows in outputs.json. "portfolio": many stocks; daily returns come
   *  from portfolio.json (outputs.json is one row per stock per day and is never loaded). */
  kind?: "single" | "portfolio";
  /** Experiment tag holding this path's config (default "config"). */
  configTag?: string;
  artifacts: {
    mlPerFold: string; // fold, precision, recall, accuracy, ic_spearman, …, base_rate, n_signals
    quantPerFold: string; // fold, pnl, sharpe, sortino, volatility, max_drawdown
    yearly?: string; // year, return, sharpe, max_drawdown
    /** Portfolio paths: daily strategy and benchmark (portfolio.json); optional gross and names held (portfolio_detail.json). */
    portfolioDetail?: string;
    // Optional tables read by extras (each extra shows only when its table is logged on the run)
    tests?: string; // test, sample, metric, hypothesis, why_this_test, statistic, null_center, effect_size, p_value, ci_low, ci_high, ci_type, n, decision
    nullDistributions?: string; // test, metric, draw, value
    rebalanceMetrics?: string; // datetime, fold, …, ic, auc, names_held_after, n_buys, n_sells, turnover, cost_drag
    quantileReturns?: string; // datetime, quantile, n_stocks, mean_signal, mean_held_return, hit_rate
    stockContribution?: string; // ticker, days_held, n_trades, contribution, gross_contribution, cost_contribution
    mlPerFoldAll?: string; // per-fold ML metrics on all days (fold_metrics.json), for the grouped CI charts
    trainTest?: string; // fold, days, train_precision, test_precision, train_base_rate, test_base_rate
    coefficients?: string; // fold, feature, coefficient, intercept
    comparison?: string; // metric, days, model_mean, model_ci_low, model_ci_high, model_pooled, momentum_*, paired_p, n
    regimeReturns?: string; // month, regime, buy_and_hold, momentum, model
    featureIc?: string; // feature, period, ic
    daily: string; // datetime, close, backward_signal, predictions, log_returns, is_rebalance_date, positions, strategy_returns, strategy_returns_tc
  };
  /** Facts not stored in MLflow, shown as written. */
  notes: {
    ruleFixedInAdvance: boolean;
    setup: [string, string][];
    tests: { name: string; status: "run" | "not computed"; result: string }[];
    findings: string[];
    findingsSource: string;
    /** How the setting was chosen, in three parts plus a final table. Optional: shown as "Coming next." when missing. */
    choice?: ChoiceNotes;
  };
}

/** A table in The choice. Cells in `tickCols` that start with `ChoiceNotes.pick` get a tick. */
export interface ChoiceTable {
  columns: string[];
  rows: string[][];
  tickCols: number[];
}

export interface ChoicePart extends ChoiceTable {
  candidates: string;
  pick: string;
  decision: string;
}

export interface ChoiceNotes {
  pick: string;
  parts: [ChoicePart, ChoicePart, ChoicePart];
  final: ChoiceTable & { why: string; caveats: string };
  source: string;
}

export interface MlflowRun {
  run_id: string;
  name: string;
  status: string;
  start_time: number | null;
  end_time: number | null;
  parent_run_id: string | null;
  params: Record<string, string>;
  metrics: Record<string, number | null>;
  tags: Record<string, string>;
  artifacts: { path: string; size_bytes: number }[];
}

export interface MlflowExperiment {
  id: string;
  name: string;
  runs: number;
  tags: Record<string, string>;
}

/** An MLflow table (log_table JSON) turned into rows. */
export type Row = Record<string, unknown>;
