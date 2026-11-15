import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose. Pages fetch fresh data on each
  // request, which is simpler for a hackathon. Turn it on later if needed.
  cacheComponents: false,
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
