import { defineConfig } from "@playwright/test";

const frontendUrl = process.env.E2E_APP_URL ?? process.env.FRONTEND_URL ?? "http://127.0.0.1:5173";
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? "./tests/e2e/results";
const htmlOutputDir = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? "./tests/e2e/report";
const isDemoVideo = process.env.E2E_DEMO_VIDEO === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: isDemoVideo ? 0 : 1,
  workers: 1,
  timeout: isDemoVideo ? 300_000 : 30_000,
  outputDir,
  snapshotPathTemplate: "{testDir}/reference/{arg}{ext}",
  reporter: [["list"], ["html", { open: "never", outputFolder: htmlOutputDir }]],
  use: {
    baseURL: frontendUrl,
    trace: isDemoVideo ? "on" : "on-first-retry",
    screenshot: "only-on-failure",
    video: isDemoVideo ? { mode: "on", size: { width: 1280, height: 720 } } : "retain-on-failure",
    headless: true,
    ...(isDemoVideo ? { viewport: { width: 1280, height: 720 } } : {}),
    launchOptions: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
});
