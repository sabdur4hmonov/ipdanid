import { defineConfig } from "@playwright/test";
import protectedConfig from "./playwright.protected.config";
export default defineConfig({
  ...protectedConfig,
  testDir: "tests/website-e2e",
  testMatch: "website-w2.spec.ts",
});
