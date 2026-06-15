import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Required for z-ai-web-dev-sdk on Vercel
  serverExternalPackages: ['z-ai-web-dev-sdk'],
};

export default nextConfig;