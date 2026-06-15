import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Required for z-ai-web-dev-sdk and Neon on Vercel
  serverExternalPackages: ['z-ai-web-dev-sdk', 'ws'],
};

export default nextConfig;