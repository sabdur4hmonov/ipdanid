import { defineConfig, devices } from "@playwright/test";
const previewPort = Number(process.env.IP_RASM_TEST_PORT || 4183);
if (!Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535)
  throw Error("Invalid local test port");
export default defineConfig({
  reporter: process.env.IP_RASM_TEST_REPORT
    ? [["line"], ["json", { outputFile: process.env.IP_RASM_TEST_REPORT }]]
    : undefined,
  testDir: "tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run server",
      url: "http://127.0.0.1:4311/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run preview -- --port ${previewPort} --strictPort`,
      url: `http://127.0.0.1:${previewPort}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-browser", use: { ...devices["Pixel 7"] } },
  ],
});
