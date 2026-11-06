// SAMPLE DATA. Shown until the backend endpoints for experiments and saves exist.
// Delete this file once src/data/LedgerProvider.tsx reads from the server.

import type { Dataset, DatasetVersion, Experiment, VersionRef } from "@/core/types";

const E1 = "mom12d_midcap150";
const E2 = "mom12d_midcap150_reg";
const E3 = "meanrev5d_midcap150";

const S01 = "01_data_pipeline";
const S03 = "03_dataset_construction";
const S05 = "05_baseline_research";
const S06 = "06_model_development";

const ref = (experiment: string, section: string, dataset: string, version: number): VersionRef => ({
  experiment,
  section,
  dataset,
  version,
});

export const sampleExperiments: Experiment[] = [
  { name: E1, description: "12-day momentum on Nifty Midcap 150 with binary labels.", createdAt: "2026-10-14T10:12:00+05:30" },
  {
    name: E2,
    description: "Same frozen data as mom12d_midcap150, with regression labels instead of binary.",
    createdAt: "2026-10-29T16:40:00+05:30",
  },
  { name: E3, description: "5-day mean reversion. Early idea, nothing saved yet.", createdAt: "2026-11-04T09:05:00+05:30" },
];

const SNAPSHOT_COLUMNS = ["date", "symbol", "open", "high", "low", "close", "volume", "turnover", "in_universe"];
const MOMENTUM_COLUMNS = ["date", "symbol", "mom_5", "mom_10", "mom_21", "mom_63", "mom_126"];
const MOMENTUM_RANKS = ["mom_21_rank", "mom_63_rank", "mom_126_rank", "mom_5_rank", "mom_10_rank"];
const LABEL_COLUMNS = ["date", "symbol", "end_date", "fwd_return_12d", "label"];
const SPLIT = { trainDays: 504, testDays: 63, gapDays: 12 };

function v(
  r: VersionRef,
  createdAt: string,
  rest: Partial<Omit<DatasetVersion, "ref" | "createdAt">> = {},
): DatasetVersion {
  return { ref: r, createdAt, status: "complete", settings: {}, inputs: [], ...rest };
}

const e1Snapshot2 = ref(E1, S01, "snapshot", 2);
const e1Universe1 = ref(E1, S01, "universe_pit", 1);
const e1Model = [ref(E1, S03, "features_momentum", 3), ref(E1, S03, "features_indicators", 1), ref(E1, S03, "labels", 2)];

export const sampleDatasets: Dataset[] = [
  // ---------------- mom12d_midcap150 ----------------
  {
    experiment: E1,
    section: S01,
    name: "snapshot",
    kind: "table",
    versions: [
      v(ref(E1, S01, "snapshot", 1), "2026-10-14T11:30:00+05:30", {
        rows: 312408,
        columns: SNAPSHOT_COLUMNS,
        settings: { source: "fresh", universe: "Nifty Midcap 150, point-in-time", start: "2018-01-01", end: "2026-10-13", timezone: "Asia/Kolkata" },
        codeVersion: "a41c9e2",
        notes: "First pull.",
      }),
      v(e1Snapshot2, "2026-10-20T09:48:00+05:30", {
        rows: 313458,
        columns: SNAPSHOT_COLUMNS,
        settings: { source: "fresh", universe: "Nifty Midcap 150, point-in-time", start: "2018-01-01", end: "2026-10-17", timezone: "Asia/Kolkata" },
        codeVersion: "b7d0f13",
        notes: "Re-pulled after the datalake split-adjustment fix.",
      }),
    ],
  },
  {
    experiment: E1,
    section: S01,
    name: "universe_pit",
    kind: "table",
    versions: [
      v(e1Universe1, "2026-10-14T11:34:00+05:30", {
        rows: 1914,
        columns: ["date", "symbol", "action", "index"],
        settings: { index: "NIFTY MIDCAP 150", source: "NSE index change notices" },
        codeVersion: "a41c9e2",
        notes: "Point-in-time membership. Used to keep only stocks in the index on each date.",
      }),
    ],
  },
  {
    experiment: E1,
    section: S03,
    name: "features_momentum",
    kind: "table",
    versions: [
      v(ref(E1, S03, "features_momentum", 1), "2026-10-15T14:02:00+05:30", {
        rows: 296112,
        columns: MOMENTUM_COLUMNS,
        inputs: [ref(E1, S01, "snapshot", 1), e1Universe1],
        settings: { lookback_days: [5, 10, 21, 63, 126], skip_recent_days: 1, cross_sectional_rank: false },
        codeVersion: "c09e4aa",
      }),
      v(ref(E1, S03, "features_momentum", 2), "2026-10-21T10:20:00+05:30", {
        rows: 297040,
        columns: MOMENTUM_COLUMNS,
        inputs: [e1Snapshot2, e1Universe1],
        settings: { lookback_days: [5, 10, 21, 63, 126], skip_recent_days: 1, cross_sectional_rank: false },
        codeVersion: "d3f1b20",
        notes: "Rebuilt on snapshot v2.",
      }),
      v(ref(E1, S03, "features_momentum", 3), "2026-10-22T18:05:00+05:30", {
        rows: 297040,
        columns: [...MOMENTUM_COLUMNS, ...MOMENTUM_RANKS],
        inputs: [e1Snapshot2, e1Universe1],
        settings: { lookback_days: [5, 10, 21, 63, 126], skip_recent_days: 1, cross_sectional_rank: true },
        codeVersion: "e81a6c4",
        notes: "Added same-date cross-sectional ranks.",
      }),
    ],
  },
  {
    experiment: E1,
    section: S03,
    name: "features_indicators",
    kind: "table",
    versions: [
      v(ref(E1, S03, "features_indicators", 1), "2026-10-23T11:15:00+05:30", {
        rows: 297040,
        columns: ["date", "symbol", "rsi_14", "macd", "macd_signal", "atr_14", "bb_width_20", "vol_21"],
        inputs: [e1Snapshot2, e1Universe1],
        settings: { rsi_days: 14, macd: [12, 26, 9], atr_days: 14, bollinger_days: 20, volatility_days: 21 },
        codeVersion: "f27c0d9",
      }),
    ],
  },
  {
    experiment: E1,
    section: S03,
    name: "labels",
    kind: "table",
    versions: [
      v(ref(E1, S03, "labels", 1), "2026-10-15T15:40:00+05:30", {
        rows: 294300,
        columns: LABEL_COLUMNS,
        inputs: [ref(E1, S01, "snapshot", 1), e1Universe1],
        settings: { label_type: "binary", horizon_days: 12, threshold: 0, rule: "12-day return above the universe median" },
        codeVersion: "c09e4aa",
      }),
      v(ref(E1, S03, "labels", 2), "2026-10-21T10:45:00+05:30", {
        rows: 295212,
        columns: LABEL_COLUMNS,
        inputs: [e1Snapshot2, e1Universe1],
        settings: { label_type: "binary", horizon_days: 12, threshold: 0, rule: "12-day return above the universe median" },
        codeVersion: "d3f1b20",
        notes: "Rebuilt on snapshot v2.",
      }),
      v(ref(E1, S03, "labels", 3), "2026-10-24T12:02:00+05:30", {
        status: "failed",
        inputs: [e1Snapshot2, e1Universe1],
        settings: { label_type: "binary", horizon_days: 12, threshold: 0.02 },
        codeVersion: "1a9b7e3",
        notes: "Upload stopped before the file reached S3. The number v3 stays used, and nothing points to missing data.",
      }),
    ],
  },
  {
    experiment: E1,
    section: S05,
    name: "mlflow",
    kind: "mlflow",
    versions: [
      v(ref(E1, S05, "mlflow", 1), "2026-10-27T19:30:00+05:30", {
        inputs: e1Model,
        codeVersion: "2b44f18",
        settings: { selected_features: ["mom_21_rank", "mom_63_rank", "mom_126_rank", "rsi_14", "vol_21"] },
        notes: "Ridge is the baseline to beat.",
        mlflow: {
          split: SPLIT,
          runs: [
            { id: "3f9a1c", name: "ic_checks", model: "IC analysis", params: { features: 18 }, metrics: { rank_ic: 0.031, icir: 0.42 } },
            { id: "7b21e0", name: "rule_momentum_top20", model: "Rule-based", params: { signal: "mom_63_rank", top_n: 20 }, metrics: { rank_ic: 0.027, sharpe: 0.84 } },
            { id: "c4d812", name: "ridge_alpha_1", model: "Ridge", params: { alpha: 1 }, metrics: { rank_ic: 0.036, icir: 0.51, sharpe: 0.97 } },
            { id: "e90b47", name: "tree_depth_4", model: "Decision tree", params: { max_depth: 4 }, metrics: { rank_ic: 0.029, icir: 0.38, sharpe: 0.71 } },
          ],
        },
      }),
    ],
  },
  {
    experiment: E1,
    section: S06,
    name: "mlflow",
    kind: "mlflow",
    versions: [
      v(ref(E1, S06, "mlflow", 1), "2026-11-03T21:10:00+05:30", {
        inputs: e1Model,
        codeVersion: "5c6d2e1",
        notes: "Optuna tuned on Sharpe after the grid search on Rank IC.",
        mlflow: {
          split: SPLIT,
          optunaTrials: 200,
          finalRunId: "5d0c9e",
          runs: [
            { id: "a17f33", name: "xgb_grid_best", model: "XGBoost", params: { max_depth: 4, learning_rate: 0.05, n_estimators: 400 }, metrics: { rank_ic: 0.041, icir: 0.58, sharpe: 1.12 } },
            { id: "5d0c9e", name: "optuna_best", model: "XGBoost", params: { max_depth: 5, learning_rate: 0.032, n_estimators: 650 }, metrics: { rank_ic: 0.044, icir: 0.61, sharpe: 1.31 } },
            { id: "91be20", name: "mlp_small", model: "Neural net (MLP)", params: { layers: "64-32", dropout: 0.2 }, metrics: { rank_ic: 0.033, icir: 0.44, sharpe: 0.92 } },
          ],
        },
      }),
    ],
  },

  // ---------------- mom12d_midcap150_reg ----------------
  {
    experiment: E2,
    section: S01,
    name: "snapshot",
    kind: "table",
    versions: [
      v(ref(E2, S01, "snapshot", 1), "2026-10-29T16:42:00+05:30", {
        rows: 313458,
        columns: SNAPSHOT_COLUMNS,
        inputs: [e1Snapshot2],
        reusedFrom: e1Snapshot2,
        settings: { source: "same as a past experiment" },
        notes: "Reused. Nothing re-fetched.",
      }),
    ],
  },
  {
    experiment: E2,
    section: S03,
    name: "features_momentum",
    kind: "table",
    versions: [
      v(ref(E2, S03, "features_momentum", 1), "2026-10-30T11:20:00+05:30", {
        rows: 297040,
        columns: [...MOMENTUM_COLUMNS, ...MOMENTUM_RANKS],
        inputs: [ref(E2, S01, "snapshot", 1)],
        settings: { lookback_days: [5, 10, 21, 63, 126], skip_recent_days: 1, cross_sectional_rank: true },
        codeVersion: "e81a6c4",
      }),
    ],
  },
  {
    experiment: E2,
    section: S03,
    name: "labels",
    kind: "table",
    versions: [
      v(ref(E2, S03, "labels", 1), "2026-10-30T11:48:00+05:30", {
        rows: 295212,
        columns: ["date", "symbol", "end_date", "fwd_return_12d_demeaned"],
        inputs: [ref(E2, S01, "snapshot", 1)],
        settings: { label_type: "regression", horizon_days: 12, target: "12-day forward return, demeaned across stocks on each date" },
        codeVersion: "9d03c57",
      }),
    ],
  },
  // meanrev5d_midcap150 has nothing saved yet.
];
