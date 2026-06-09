import { defineConfig } from "@playwright/test";

const frontendUrl = process.env.E2E_APP_URL ?? process.env.FRONTEND_URL ?? "http://127.0.0.1:5173";
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? "./test-results";
const htmlOutputDir = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? "./playwright-report";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  outputDir,
  snapshotPathTemplate: "{testDir}/../../e2e/reference/{arg}{ext}",
  reporter: [["list"], ["html", { open: "never", outputFolder: htmlOutputDir }]],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
    launchOptions: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
});
