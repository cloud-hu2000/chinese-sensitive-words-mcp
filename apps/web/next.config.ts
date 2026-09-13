import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep the native MySQL driver available to API routes in standalone builds.
  serverExternalPackages: ["mysql2"],
};

export default nextConfig;
