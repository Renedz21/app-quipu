import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./__tests__/e2e/helpers/env";

loadEnvLocal();

export default defineConfig({
  testDir: "./__tests__/e2e",
  // Cada test crea su propio usuario aislado (ver fixtures/smoke.ts +
  // helpers/auth-api.ts), así que no hay estado compartido entre tests y se
  // pueden correr en paralelo sin falsos positivos (flakiness).
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 2 workers por proceso. En CI la suite además se reparte en shards
  // (--shard=N/3), así que el paralelismo total es 3 shards × 2 workers.
  workers: 2,
  // En CI usamos el reporter `blob` para fusionar los shards en un único
  // reporte HTML (job `merge-reports` del workflow de Playwright).
  reporter: process.env.CI
    ? [["blob"], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
