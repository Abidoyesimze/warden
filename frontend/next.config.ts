import type { NextConfig } from "next";

// The browser calls /backend/*, and Next.js forwards it to the Warden backend.
// Same origin for the browser, so the backend needs no CORS setup.
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
  experimental: {
    // POST /payments/:id/execute waits for 1Click to settle, which can take a while.
    proxyTimeout: 180_000,
  },
};

export default nextConfig;
