import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// Stamped into the bundle at build time so the footer can show what is running.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // Static export keeps the whole app cacheable by the service worker, which is
  // what makes offline play work on a cold start.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
