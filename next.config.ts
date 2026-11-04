import type { NextConfig } from "next";

// Static export: Capacitor serves `out/` from the device, so there is no
// Next.js server at runtime (no API routes, Server Actions, proxy, ISR).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // /study/ → /study/index.html inside the WebView
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
