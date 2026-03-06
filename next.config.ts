import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default withSentryConfig(nextConfig, {
  org: "edzonperez",
  project: "app-quipu",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
