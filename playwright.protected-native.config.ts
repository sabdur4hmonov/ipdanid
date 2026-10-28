import { defineConfig } from "@playwright/test";
import protectedConfig from "./playwright.protected.config";
export default defineConfig({
  ...protectedConfig,
  testMatch: "native-protected.spec.ts",
});
