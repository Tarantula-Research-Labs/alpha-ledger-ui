import type { NextConfig } from "next";

// The UI talks to the FastAPI server through /api/..., so the browser never needs CORS.
// API_URL is where the FastAPI server runs (see .env.example).
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
