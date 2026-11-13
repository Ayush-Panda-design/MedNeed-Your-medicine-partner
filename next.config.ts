import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Loaded by Node at runtime instead of being bundled (pg and PGlite ship WASM/optional native paths).
  serverExternalPackages: ["pg", "@electric-sql/pglite", "@aws-sdk/client-s3"],
};

export default nextConfig;
