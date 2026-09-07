import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/New_York",
    screenshot: "only-on-failure",
  },
  outputDir: "../../work/playwright-results",
  reporter: [["list"]],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
