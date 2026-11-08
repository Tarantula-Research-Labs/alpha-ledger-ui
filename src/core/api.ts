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

/** Like apiGet, but an error reply becomes an ApiError carrying the server's own message (e.g. "already exists"). */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError(0, "The server can't be reached.");
  }
  const body = await response.text();
  let data: unknown = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    // Not JSON.
  }
  if (!response.ok) {
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new ApiError(response.status, message ?? `The server replied with an error (${response.status}).`);
  }
  return data as T;
}
