// The FastAPI address written into code snippets. Notebooks call this address directly.
export const NOTEBOOK_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// Label horizon of the first use case, used when a record doesn't say its own.
export const DEFAULT_LABEL_HORIZON_DAYS = 12;
