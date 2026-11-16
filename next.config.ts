import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  outputFileTracingIncludes: {
    "/*": ["./python/process_image.py"],
  },
};

export default nextConfig;
