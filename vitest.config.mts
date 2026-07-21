import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/__tests__/e2e/**"],
  },
  resolve: {
    tsconfigPaths: true,
  },
});
