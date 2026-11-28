import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // relatorios/ is read from disk at request time, so the deploy has to carry it
  outputFileTracingIncludes: {
    "/jurados/projetos": ["./relatorios/*/relatorio.json"],
    "/jurados/projetos/relatorio/*": ["./relatorios/*/relatorio.html"],
  },
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
