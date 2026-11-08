// Runs before every page. It lets Clerk read the sign-in on each request, and passes the page's address on,
// so a signed-out visitor can be brought back to the same page after logging in.
// The sign-in check itself happens in the layouts of the app pages (see features/auth/requireSignedIn.ts).
// (In Next.js 16 this file is called proxy.ts; it used to be middleware.ts.)
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware((_auth, req) => {
  const headers = new Headers(req.headers);
  headers.set("x-ledger-path", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
});

export const config = {
  // Every page and every /api route (the /api route checks the Clerk sign-in itself), but not Next.js internals or static files.
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api)(.*)"],
};
