import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.EXPORT_STATIC === "true" ? "export" : undefined,
  images: {
    unoptimized: process.env.EXPORT_STATIC === "true" ? true : undefined,
  },
};

export default nextConfig;
