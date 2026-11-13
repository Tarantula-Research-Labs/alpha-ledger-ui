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
  setting: { param: string; name: string; label: (value: string) => string };
  benchmark: string; // e.g. "CRISIL buy-and-hold"
  artifacts: {
    mlPerFold: string; // fold, precision, recall, accuracy, ic_spearman, …, base_rate, n_signals
    quantPerFold: string; // fold, pnl, sharpe, sortino, volatility, max_drawdown
    yearly?: string; // year, return, sharpe, max_drawdown
    daily: string; // datetime, close, backward_signal, predictions, log_returns, is_rebalance_date, positions, strategy_returns, strategy_returns_tc
  };
  /** Facts not stored in MLflow, shown as written. */
  notes: {
    ruleFixedInAdvance: boolean;
    setup: [string, string][];
    tests: { name: string; status: "run" | "not computed"; result: string }[];
    findings: string[];
    findingsSource: string;
  };
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
