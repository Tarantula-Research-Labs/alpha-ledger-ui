// The shapes of the data the UI works with. They mirror the version records in DynamoDB.

export interface VersionRef {
  experiment: string;
  section: string; // section folder, e.g. "03_dataset_construction"
  dataset: string;
  version: number;
}

export type VersionStatus = "complete" | "pending" | "failed";

export interface MlflowRun {
  id: string;
  name: string;
  model: string;
  params: Record<string, string | number>;
  metrics: Record<string, number>;
}

export interface WalkForwardSplit {
  trainDays: number;
  testDays: number;
  gapDays: number;
}

export interface MlflowPush {
  runs: MlflowRun[];
  finalRunId?: string;
  split?: WalkForwardSplit;
  optunaTrials?: number;
}

export interface DatasetVersion {
  ref: VersionRef;
  status: VersionStatus;
  createdAt: string; // ISO time
  rows?: number;
  columns?: string[];
  settings: Record<string, unknown>;
  inputs: VersionRef[]; // versions this one was built from
  codeVersion?: string; // git commit
  notes?: string;
  mlflow?: MlflowPush; // Baseline Research / Model Development pushes
}

export interface Dataset {
  experiment: string;
  section: string;
  name: string;
  kind: "table" | "mlflow";
  versions: DatasetVersion[]; // oldest first
}

export interface Experiment {
  name: string;
  description: string;
  createdAt: string;
}
