// Calls to the real FastAPI server. The browser goes through /api, which Next.js forwards
// to the server (see next.config.ts).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(0, "The server can't be reached.");
  }
  const body = await response.text();
  let data: unknown = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    // Not JSON: usually the proxy reporting that the server is down.
  }
  if (!response.ok && data === null) {
    throw new ApiError(response.status, "The server can't be reached.");
  }
  return data as T;
}
