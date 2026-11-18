import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/p2-e2e",
  workers: 1,
  timeout: 240_000,
  use: {
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    channel: process.env.IP_RASM_P2_BROWSER_CHANNEL || undefined,
    trace: "off",
  },
});
