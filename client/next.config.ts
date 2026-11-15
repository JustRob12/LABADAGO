import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Prevent stylistic ESLint errors from blocking production builds on Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
