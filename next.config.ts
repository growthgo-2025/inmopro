import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "staticmap.openstreetmap.de" },
      { protocol: "https", hostname: "z-cdn.chatglm.cn" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
