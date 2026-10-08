import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4183", trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm run server",
      url: "http://127.0.0.1:4311/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run preview -- --port 4183",
      url: "http://127.0.0.1:4183",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-browser", use: { ...devices["Pixel 7"] } },
  ],
});
