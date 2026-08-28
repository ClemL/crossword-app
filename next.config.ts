import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Static export keeps the whole app cacheable by the service worker, which is
  // what makes offline play work on a cold start.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
