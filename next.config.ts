import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // brand board (static HTML in public/identidade)
  rewrites() {
    return [
      { source: "/identidade", destination: "/identidade/index.html" },
      { source: "/identidade/camisas", destination: "/identidade/camisas/index.html" },
    ];
  },
  partialPrefetching: true,
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
