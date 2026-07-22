import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow ngrok domains in development for phone testing
  allowedDevOrigins: ["paging-undermost-ultra.ngrok-free.dev"],
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
