// Code snippets the UI hands to notebooks. Paste once; every run does the whole job.
//
// Saving (files go straight to S3, never through the server):
//   1. POST /experiments/{experiment}/sections/{section}/datasets/{dataset}/versions
//        body: {"filename": "...", "meta": {inputs, settings, notes, code_version, rows, columns, ...}}
//        reply: {"version": N, "upload_url": "...", "upload_headers": {...}, "expires_at": "..."}
//   2. PUT the file to upload_url with upload_headers (a short-lived link; it refuses to overwrite)
//   3. POST .../versions/{N}/complete   -> the server checks the file is in S3 and marks v{N} complete
// Loading:
//   GET .../versions/{N or "latest"}   -> the version's record, with a short-lived download_url
// MLflow pushes use the same steps with dataset "mlflow" and a zip of mlflow.db + artifacts.

import { NOTEBOOK_API_URL } from "@/core/config";
import type { VersionRef } from "@/core/types";

const pyName = (s: string) => (/^[a-z_]/.test(s) ? s : `_${s}`).replace(/[^a-z0-9_]/g, "_");

const GIT_HELPER = `def _git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return None`;

// The three save steps, shared by tables and MLflow pushes.
const LEDGER_SAVE = `def _ledger_save(versions_url, data, filename, meta):
    # 1. Reserve the next version and get a short-lived upload link
    r = requests.post(versions_url, json={"filename": filename, "meta": meta})
    r.raise_for_status()
    slot = r.json()
    # 2. Upload the file straight to S3
    up = requests.put(slot["upload_url"], data=data, headers=slot["upload_headers"])
    up.raise_for_status()
    # 3. Tell the server the upload finished
    done = requests.post(f"{versions_url}/{slot['version']}/complete")
    done.raise_for_status()
    return slot["version"]`;

export function saveTableSnippet(experiment: string, section: string, dataset: string): string {
  const fn = `save_${pyName(dataset)}`;
  return `# Save to Alpha Ledger: ${experiment} / ${section} / ${dataset}
# Paste once. Every run saves the next version and prints its number.
import io, subprocess, requests

LEDGER_API = "${NOTEBOOK_API_URL}"
VERSIONS_URL = f"{LEDGER_API}/experiments/${experiment}/sections/${section}/datasets/${dataset}/versions"

${GIT_HELPER}

${LEDGER_SAVE}

def ${fn}(df, settings=None, notes=""):
    buf = io.BytesIO()
    df.to_parquet(buf, index=False)
    meta = {
        "inputs": globals().get("LEDGER_INPUTS", []),  # versions this notebook loaded
        "settings": settings or {},
        "notes": notes,
        "code_version": _git_commit(),
        "rows": len(df),
        "columns": [str(c) for c in df.columns],
    }
    version = _ledger_save(VERSIONS_URL, buf.getvalue(), "data.parquet", meta)
    print("Saved ${dataset} version", version)
    return version

${fn}(df, settings={}, notes="")
`;
}

export function loadTableSnippet(r: VersionRef, mode: "pinned" | "latest"): string {
  const version = mode === "pinned" ? String(r.version) : `"latest"`;
  return `# Load from Alpha Ledger: ${r.experiment} / ${r.section} / ${r.dataset} ${mode === "pinned" ? `v${r.version}` : "(latest)"}
import io, requests
import pandas as pd

LEDGER_API = "${NOTEBOOK_API_URL}"
REF = {"experiment": "${r.experiment}", "section": "${r.section}",
       "dataset": "${r.dataset}", "version": ${version}}

info = requests.get(f"{LEDGER_API}/experiments/{REF['experiment']}/sections/{REF['section']}"
                    f"/datasets/{REF['dataset']}/versions/{REF['version']}")
info.raise_for_status()
info = info.json()
REF["version"] = info["version"]  # the exact version loaded, even when "latest" was asked
file = requests.get(info["download_url"])  # short-lived link straight to S3
file.raise_for_status()
${pyName(r.dataset)} = pd.read_parquet(io.BytesIO(file.content))

# Remember what this notebook read. The save snippet sends it as the inputs.
LEDGER_INPUTS = [x for x in globals().get("LEDGER_INPUTS", []) if x != REF] + [REF]
`;
}

export function pushMlflowSnippet(experiment: string, section: string, withFinalModel: boolean): string {
  const finalLines = withFinalModel
    ? `FINAL_RUN_ID = ""      # the MLflow run id of the final model
OPTUNA_TRIALS = None   # how many Optuna trials were run
`
    : "";
  const finalMeta = withFinalModel ? `\n    "final_run_id": FINAL_RUN_ID,\n    "optuna_trials": OPTUNA_TRIALS,` : "";
  return `# Push MLflow results to Alpha Ledger: ${experiment} / ${section}
# Run once this stage is done. Each push is a new version; earlier pushes stay untouched.
import io, pathlib, subprocess, zipfile, requests

LEDGER_API = "${NOTEBOOK_API_URL}"
VERSIONS_URL = f"{LEDGER_API}/experiments/${experiment}/sections/${section}/datasets/mlflow/versions"

MLFLOW_DB = pathlib.Path("mlflow.db")
ARTIFACTS = pathlib.Path("mlartifacts")   # change to your MLflow artifacts folder
SPLIT = {"train_days": 504, "test_days": 63, "gap_days": 12}   # walk-forward windows used
${finalLines}
${GIT_HELPER}

${LEDGER_SAVE}

buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(MLFLOW_DB, "mlflow.db")
    for f in ARTIFACTS.rglob("*"):
        if f.is_file():
            z.write(f, pathlib.Path("artifacts") / f.relative_to(ARTIFACTS))

meta = {
    "inputs": globals().get("LEDGER_INPUTS", []),
    "split": SPLIT,${finalMeta}
    "code_version": _git_commit(),
}
version = _ledger_save(VERSIONS_URL, buf.getvalue(), "mlflow.zip", meta)
print("Pushed version", version)
`;
}

export function datalakeSnippet(): string {
  return `# Pull raw data from trl_datalake (Postgres).
# Keep the password out of the notebook: set an environment variable first, e.g.
#   TRL_DATALAKE_URL=postgresql+psycopg://user:password@host:5432/trl_datalake
import os
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine(os.environ["TRL_DATALAKE_URL"])
df = pd.read_sql("""
    -- your query: prices for the point-in-time Midcap 150 universe since 2018
    SELECT ...
""", engine)

# Then save it with the snapshot save snippet, so later sections read this frozen copy.
`;
}
