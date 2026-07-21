import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./__tests__/e2e/helpers/env";

loadEnvLocal();

const authFile = path.join("playwright", ".auth", "session.json");

export default defineConfig({
  testDir: "./__tests__/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: fs.existsSync(authFile) ? authFile : undefined,
      },
    },
  ],
  ...(process.env.CI
    ? {
        webServer: {
          command: "pnpm dev",
          url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }
    : {}),
});
