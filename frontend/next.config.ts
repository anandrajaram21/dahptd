import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel routes /api directly to FastAPI. Only local Next.js needs a proxy.
  async rewrites() {
    if (process.env.VERCEL) return [];

    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
