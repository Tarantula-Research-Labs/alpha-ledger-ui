import type { NextConfig } from "next";

// The UI reaches the FastAPI server through its own /api route (src/app/api/[...path]/route.ts),
// which checks the Clerk sign-in and adds the shared key.
const nextConfig: NextConfig = {};

export default nextConfig;
