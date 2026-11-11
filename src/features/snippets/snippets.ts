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

/** Step 1 of Data Pipeline: Luv's DBCONNECT class for the Postgres market data database. */
/** Imports for the DBCONNECT snippet, shown on the right of its step. */
export function dbConnectImportsSnippet(): string {
  return `import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
`;
}

export function dbConnectSnippet(): string {
  return `"""Connects to the QuantX Postgres DB and loads NSE OHLCV data into pandas DataFrames."""

# Load .env into os.environ so the DB credentials can be read with os.getenv().
load_dotenv()


class DBCONNECT:
    """Wraps a SQLAlchemy engine for the market_data Postgres database."""

    def __init__(self):
        # Connection settings from .env (a missing key comes back as None).
        self.PG_HOST = os.getenv("DB_HOST")
        self.PG_PORT = os.getenv("DB_PORT")
        self.PG_NAME = os.getenv("DB_NAME")
        self.PG_USER = os.getenv("DB_USER")
        self.PG_PASSWORD = os.getenv("DB_PASSWORD")

        # URL format: dialect+driver://user:password@host:port/database
        # create_engine() is lazy: it sets up a connection pool, and connections open on first use.
        self.engine = create_engine(
            f"postgresql+psycopg2://{self.PG_USER}:{self.PG_PASSWORD}@{self.PG_HOST}:{self.PG_PORT}/{self.PG_NAME}"
        )

    def test_connection(self):
        """Print the Postgres server version to confirm the connection works."""
        # \`with\` hands the connection back to the pool when the block ends, even on error.
        with self.engine.connect() as conn:
            # .scalar() returns the first column of the first row as a plain value.
            print(conn.execute(text("SELECT version();")).scalar())

    def query(self, sql, params=None):
        """Run a SQL query (with optional :named params) and return a DataFrame."""
        # With params, wrap in text() so :name placeholders are bound safely by the driver (no SQL injection).
        if params is not None:
            sql = text(sql)
        return pd.read_sql(sql, self.engine, params=params)

    def wrangle(self, tickers, timeframe):
        """Load OHLCV bars from nse.ohlcv_<timeframe> for the tickers, indexed by IST datetime."""
        # Allow a single ticker string like "TCS"; otherwise it would be split into ['T', 'C', 'S']
        if isinstance(tickers, str):
            tickers = [tickers]

        # ANY(:tickers) matches against the whole list in one bound parameter (sent as a Postgres array).
        # The table name comes from an f-string (table names can't be bound), so only pass trusted timeframes.
        query = f"""
            SELECT *
            FROM nse.ohlcv_{timeframe}
            WHERE ticker = ANY(:tickers)
        """

        df = self.query(query, params={"tickers": list(tickers)}).sort_values(by="timestamp")
        df = df.rename(columns={"timestamp": "datetime"})

        # Make sure the column is a real pandas datetime type, not strings.
        df["datetime"] = pd.to_datetime(df["datetime"])

        if timeframe == "daily":
            # Daily bars are stored as IST midnight (= 18:30 UTC the previous day).
            # Convert to IST before dropping the timezone, otherwise every date shifts one day early.
            if df["datetime"].dt.tz is not None:
                df["datetime"] = df["datetime"].dt.tz_convert("Asia/Kolkata").dt.tz_localize(None)
            # Drop any time-of-day part so each bar is labelled with just its date.
            df["datetime"] = df["datetime"].dt.normalize()
        else:
            # Intraday: treat naive timestamps as UTC, then show them in IST (NSE hours 09:15-15:30).
            if df["datetime"].dt.tz is None:
                df["datetime"] = df["datetime"].dt.tz_localize("UTC")

            df["datetime"] = df["datetime"].dt.tz_convert("Asia/Kolkata")

        # A datetime index allows slicing like df.loc["2024-01":"2024-06"] and .resample() / .rolling().
        df = df.set_index("datetime")

        return df


# =============================================================================
# NOTES: how DBCONNECT works
# =============================================================================
#
# 1. What it does
#    - Reads Postgres credentials from .env, builds one SQLAlchemy engine
#      (with a connection pool) per DBCONNECT object, and returns query
#      results as pandas DataFrames.
#
# 2. Connection settings (from .env; the password lives only in .env, which
#    is git-ignored)
#        DB_HOST=<your database host>
#        DB_PORT=5432
#        DB_NAME=market_data
#        DB_USER=<your database user>
#        DB_PASSWORD=<your password>
#
# 3. Data flow
#        .env -> os.environ -> DBCONNECT.__init__ -> SQLAlchemy engine
#             -> query()/wrangle() -> pd.read_sql -> pandas DataFrame
#
# 4. Usage
#        db = DBCONNECT()
#        db.test_connection()                       # prints Postgres version
#        df = db.wrangle(["TCS", "INFY"], "daily")  # OHLCV indexed by datetime
#        raw = db.query("SELECT * FROM nse.ohlcv_daily WHERE ticker = :t",
#                       params={"t": "TCS"})
#
# 5. Expected database layout
#    - Schema \`nse\` with one table per timeframe: nse.ohlcv_daily,
#      nse.ohlcv_<other> ...
#    - Each table needs at least \`ticker\` and \`timestamp\` columns, plus the
#      OHLCV columns.
#
# 6. Timezone handling
#    - Daily: stored as IST midnight (18:30 UTC the previous day). Converting
#      to IST before dropping the timezone keeps the trading date correct.
#    - Intraday: kept timezone-aware in Asia/Kolkata.
#
# 7. Things to keep in mind / possible improvements
#    - Reuse one DBCONNECT object; each one creates its own connection pool.
#    - Special characters in the password (@ : / # %) break the URL. Use
#      sqlalchemy.engine.URL.create(...) or urllib.parse.quote_plus() to fix.
#    - Check \`timeframe\` against an allow-list before passing untrusted values.
#    - wrangle() loads a ticker's full history (no date filter). For large
#      intraday tables, add WHERE timestamp BETWEEN :start AND :end.
#    - With several tickers, rows are mixed in time order; use
#      df.groupby("ticker") for per-ticker work.
#    - numpy and matplotlib are imported but not used here.
#    - Call self.engine.dispose() to close pooled connections when finished.
# =============================================================================

db = DBCONNECT()
db.test_connection()
`;
}

/** Step 2 of Data Pipeline: load the bars for the experiment's universe. */
export function loadMarketDataSnippet(): string {
  return `# Load daily OHLCV for your universe (for example the point-in-time Nifty Midcap 150 list).
tickers = ["TCS", "INFY"]  # replace with your universe
df = db.wrangle(tickers, "daily")

# Keep datetime as a column so it is saved with the snapshot.
df = df.reset_index()
`;
}

// Section files (saved straight into <experiment>/<section>/ in S3, under their own name). Same for every section.
// Server endpoints, under /experiments/{experiment}/sections/{section}:
//   POST files/{filename}                      -> next free name + 15-minute upload link
//   POST files/{filename}/{version}/complete   -> the server checks the file is in S3
//   GET  files/{filename}/{version | latest}   -> 15-minute download link
const LEDGER_CONNECT_KEY = `load_dotenv()  # reads LEDGER_API_KEY from the .env next to this notebook
HEADERS = {"X-Ledger-Key": os.environ["LEDGER_API_KEY"]}`;

const filesUrl = (experiment: string, section: string) =>
  `FILES_URL = f"{LEDGER_API}/experiments/${experiment}/sections/${section}/files"`;

/** Imports for the push snippet, shown on the right of its step. */
export function pushFileImportsSnippet(): string {
  return `import io, os, requests
from dotenv import load_dotenv
`;
}

export function pushFileSnippet(experiment: string, section: string, name: string): string {
  return `load_dotenv()
LEDGER_API = "${NOTEBOOK_API_URL}"
HEADERS = {"X-Ledger-Key": os.environ["LEDGER_API_KEY"]}
${filesUrl(experiment, section)}

DATA = df  # change: the DataFrame to push
NAME = "${name}"  # change: the file name (same name = new version)

buf = io.BytesIO()
DATA.to_parquet(buf)

r = requests.post(f"{FILES_URL}/{NAME}", headers=HEADERS,
                  json={"rows": len(DATA), "columns": [str(c) for c in DATA.columns]})
r.raise_for_status()
slot = r.json()

requests.put(slot["upload_url"], data=buf.getvalue(), headers=slot["upload_headers"]).raise_for_status()
requests.post(f"{FILES_URL}/{NAME}/{slot['version']}/complete", headers=HEADERS).raise_for_status()
print(f"Saved {slot['saved_as']} (v{slot['version']})")
`;
}

/** Imports for the retrieve snippet, shown on the right of its step. */
export function retrieveFileImportsSnippet(): string {
  return `import io, os, requests
import pandas as pd
from dotenv import load_dotenv
`;
}

/** Loads one file from a section: a version number for exactly that copy, or "latest". */
export function retrieveFileSnippet(
  experiment: string,
  section: string,
  file: string,
  version: number | "latest" = "latest",
  withImports = false,
): string {
  const versionLine = version === "latest" ? `VERSION = "latest"` : `VERSION = ${version}`;
  return `${withImports ? retrieveFileImportsSnippet() + "\n" : ""}load_dotenv()
LEDGER_API = "${NOTEBOOK_API_URL}"
HEADERS = {"X-Ledger-Key": os.environ["LEDGER_API_KEY"]}
${filesUrl(experiment, section)}

FILE = "${file}"  # change: the name it was pushed with
${versionLine}  # change: a version number, or "latest"

r = requests.get(f"{FILES_URL}/{FILE}/{VERSION}", headers=HEADERS)
r.raise_for_status()
info = r.json()

data = requests.get(info["download_url"])
data.raise_for_status()
df = pd.read_parquet(io.BytesIO(data.content))
print(f"Loaded {info['saved_as']} (v{info['version']}): {len(df)} rows")
df.head()
`;
}

/** Tools: walk-forward splits on calendar months, with a trading-day gap. */
export function walkForwardImportsSnippet(): string {
  return `import numpy as np
import pandas as pd
`;
}

export function walkForwardSnippet(): string {
  return `class WALKFORWARDSPLIT:
    """
    Walk-forward splits based on calendar months.

    Splits on DATES, not row positions. Every row with the same date
    goes to the same side, so a date can never be in both train and test.
    Works with pooled (stock x date) frames that have duplicate dates.

    Parameters
    ----------
    train_months : int   Length of the training window, in months.
    test_months  : int   Length of each test window, in months (1, 3, 6 ...).
    step_months  : int   How far to move forward each fold. Default = test_months.
    expanding    : bool  True  = train always starts at the first date (grows).
                         False = train is a fixed-length rolling window.
    gap          : int   Trading days dropped between train end and test start.
                         Counted from the actual dates in your data, so
                         weekends and holidays don't count.
                         Set it to how many days ahead your label looks.
    date_col     : str   Column holding the dates. None = use the index.
    """

    def __init__(self, train_months=15, test_months=3, step_months=None,
                 expanding=True, gap=0, date_col=None):
        self.train_months = train_months
        self.test_months = test_months
        self.step_months = step_months or test_months
        self.expanding = expanding
        self.gap = gap
        self.date_col = date_col

    def _dates(self, df):
        d = df.index if self.date_col is None else df[self.date_col]
        return pd.DatetimeIndex(pd.to_datetime(d))

    def split(self, df):
        """Yield (train_positions, test_positions) for use with df.iloc."""
        dates = self._dates(df)
        first, last = dates.min(), dates.max()

        # Sorted list of trading days that exist in the data
        trading_days = dates.unique().sort_values()

        # Start at the beginning of the first month.
        # Keep the data's timezone (None if the dates have no timezone).
        start = pd.Timestamp(year=first.year, month=first.month, day=1, tz=first.tz)
        cutoff = start + pd.DateOffset(months=self.train_months)

        while cutoff <= last:
            if self.expanding:
                train_start = start
            else:
                train_start = cutoff - pd.DateOffset(months=self.train_months)

            test_end = cutoff + pd.DateOffset(months=self.test_months)

            # Position of the first trading day in the test block.
            # Step back \`gap\` trading days to get where training stops.
            test_pos = trading_days.searchsorted(cutoff)
            train_end_pos = test_pos - self.gap
            if train_end_pos <= 0:
                cutoff += pd.DateOffset(months=self.step_months)
                continue
            train_end = trading_days[train_end_pos]

            train_mask = (dates >= train_start) & (dates < train_end)
            test_mask = (dates >= cutoff) & (dates < test_end)

            if train_mask.any() and test_mask.any():
                yield np.where(train_mask)[0], np.where(test_mask)[0]

            cutoff += pd.DateOffset(months=self.step_months)

    def get_n_splits(self, df):
        return sum(1 for _ in self.split(df))

    def describe(self, df):
        """Table of the date range of each fold."""
        dates = self._dates(df)
        rows = []
        for i, (tr, te) in enumerate(self.split(df)):
            rows.append({
                "fold": i,
                "train_start": dates[tr].min().date(),
                "train_end": dates[tr].max().date(),
                "test_start": dates[te].min().date(),
                "test_end": dates[te].max().date(),
                "train_rows": len(tr),
                "test_rows": len(te),
            })
        return pd.DataFrame(rows)
`;
}
