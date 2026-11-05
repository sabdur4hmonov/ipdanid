import { defineConfig } from "@playwright/test";
import protectedConfig from "./playwright.protected.config";
export default defineConfig({
  ...protectedConfig,
  // Keep the unchanged 3/minute generation budget. The protected cancellation
  // suite runs separately with its own fresh API, not as the same IP's fourth start.
  testDir: "tests/website-e2e",
  testMatch: "website-w1.spec.ts",
});
