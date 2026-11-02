import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  // Past years are read from disk at runtime; make sure they ship with the deployed app.
  outputFileTracingIncludes: { "/**": ["./data/history/**"] },
  // Keep the dev-only badge clear of the picks page's total bar.
  devIndicators: { position: "top-left" },
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
