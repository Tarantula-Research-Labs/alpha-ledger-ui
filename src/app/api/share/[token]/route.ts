// Public door for share links: no sign-in. Reads the frozen copy straight from S3, so it works with the server off.
//   ?part=meta  → is the link valid? (never cached)  → 410 when revoked or expired
//   ?part=data  → the frozen results (the browser keeps them; they never change)
// Uses the web app's AWS user, which may read only _shares/* in the bucket. Its keys stay on the web app's server side.
import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

const BUCKET = process.env.SHARES_BUCKET ?? "quantitative-research-application";

function s3() {
  return new S3Client({
    region: "ap-south-1",
    credentials: {
      accessKeyId: process.env.POWER_AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.POWER_AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });

async function read(key: string): Promise<string | null> {
  try {
    const r = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return (await r.Body?.transformToString()) ?? null;
  } catch (e) {
    if (e instanceof NoSuchKey) return null;
    throw e;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return fail(404, "share_not_found", "This link doesn't exist.");
  try {
    const metaText = await read(`_shares/${token}/meta.json`);
    if (!metaText) return fail(404, "share_not_found", "This link doesn't exist.");
    const meta = JSON.parse(metaText) as { revoked: boolean; expires_at: string } & Record<string, unknown>;
    if (meta.revoked) return fail(410, "share_revoked", "The owner has turned this link off.");
    if (new Date(meta.expires_at).getTime() < Date.now()) return fail(410, "share_expired", "This link has expired.");

    if (req.nextUrl.searchParams.get("part") === "data") {
      const data = await read(`_shares/${token}/data.json`);
      if (!data) return fail(404, "share_not_found", "This report's data is missing.");
      return new NextResponse(data, {
        headers: { "content-type": "application/json", "cache-control": "private, max-age=31536000, immutable" },
      });
    }
    const { experiment, section, path_id, path_title, created_at, expires_at, version } = meta;
    return NextResponse.json({ experiment, section, path_id, path_title, created_at, expires_at, version }, { headers: { "cache-control": "no-store" } });
  } catch {
    return fail(502, "storage_error", "The report couldn't be read right now. Try again in a moment.");
  }
}
