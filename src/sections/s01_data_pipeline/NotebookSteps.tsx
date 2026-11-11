"use client";

import { CodeSteps, type CodeStep } from "@/features/files/CodeSteps";
import {
  dbConnectImportsSnippet,
  dbConnectSnippet,
  loadMarketDataSnippet,
  pushFileImportsSnippet,
  pushFileSnippet,
  retrieveFileImportsSnippet,
  retrieveFileSnippet,
} from "@/features/snippets/snippets";

const FOLDER = "01_data_pipeline";

function steps(experiment: string): CodeStep[] {
  return [
    {
      title: "Connect to the database",
      text: "Opens a connection to the market data in Postgres. Keep the database credentials in a .env file next to your notebook.",
      code: dbConnectSnippet(),
      imports: dbConnectImportsSnippet(),
    },
    {
      title: "Load the data",
      text: "Reads daily prices for the tickers you list into a DataFrame. Nothing is saved yet.",
      code: loadMarketDataSnippet(),
      imports: null,
      noImports: "No imports needed: uses db from step 1.",
    },
    {
      title: "Push your data to S3",
      text: "Saves a DataFrame into this experiment's Data Pipeline folder under the name you give it. The same name again saves a new numbered copy (_v2, _v3, …). Needs LEDGER_API_KEY in the .env.",
      code: pushFileSnippet(experiment, FOLDER, "Nifty_Midcap150_OHLCV_daily.parquet"),
      imports: pushFileImportsSnippet(),
    },
    {
      title: "Retrieve it",
      text: "Loads a file you pushed back into a DataFrame, in any notebook. Loads the newest copy unless you name a version.",
      code: retrieveFileSnippet(experiment, FOLDER, "Nifty_Midcap150_PointInTime.parquet"),
      imports: retrieveFileImportsSnippet(),
    },
  ];
}

export function NotebookSteps({ experiment }: { experiment: string }) {
  return <CodeSteps steps={steps(experiment)} />;
}
