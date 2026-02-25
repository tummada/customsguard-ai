import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use process.cwd() instead of __dirname for better ESM compatibility
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
