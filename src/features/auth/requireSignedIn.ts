// The sign-in check for app pages. Used by the layouts of the experiments list, server status and the
// experiment workspace. A signed-out visitor goes to the landing page with the Log in popup open,
// and comes back to the page they asked for after logging in.
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireSignedIn(): Promise<string> {
  const { userId } = await auth();
  if (userId) return userId;
  const asked = (await headers()).get("x-ledger-path") ?? "/experiments";
  const next = asked.startsWith("/") && !asked.startsWith("//") ? asked : "/experiments";
  redirect(`/?auth=login&next=${encodeURIComponent(next)}`);
}
