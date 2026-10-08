import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:8000",
    viewport: { width: 1440, height: 900 },
    timezoneId: "Asia/Seoul",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "node scripts/serve.js",
        url: "http://127.0.0.1:8000",
        reuseExistingServer: !process.env.CI,
      },
  reporter: [["list"]],
});
