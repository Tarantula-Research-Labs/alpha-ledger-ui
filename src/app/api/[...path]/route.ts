// The web app's door to the FastAPI server. Every /api/... call from the browser comes here.
// It checks you're signed in with Clerk, adds the shared key, and forwards the call to the server.
// The key is read on the web app's server side (LEDGER_API_KEY), so it never reaches the browser.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";
const API_KEY = process.env.LEDGER_API_KEY ?? "";

async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  // /api/health stays open so the server light works; everything else needs sign-in.
  if (path.join("/") !== "health") {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: { code: "signed_out", message: "Sign in first." } }, { status: 401 });
    }
  }

  try {
    const res = await fetch(`${API_URL}/${path.join("/")}${req.nextUrl.search}`, {
      method: req.method,
      headers: { "content-type": "application/json", "X-Ledger-Key": API_KEY },
      body: req.method === "POST" ? await req.text() : undefined,
      cache: "no-store",
    });
    // A pushed MLflow version never changes: let the browser keep it (private: only this signed-in browser).
    const exactVersion = req.method === "GET" && /\/mlflow\/[^/]+\/[1-9][0-9]*\//.test(`/${path.join("/")}/`);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (exactVersion && res.ok) headers["cache-control"] = "private, max-age=31536000, immutable";
    return new NextResponse(await res.text(), { status: res.status, headers });
  } catch {
    return NextResponse.json({ error: { code: "server_unreachable", message: "The server can't be reached." } }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as DELETE };
