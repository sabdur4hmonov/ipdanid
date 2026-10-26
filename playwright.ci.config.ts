import { defineConfig } from "@playwright/test";
import local from "./playwright.config";

// Public checkout tests use only committed synthetic inputs. Private portrait
// experiments remain in the local suite and are never required or uploaded here.
export default defineConfig({
  ...local,
  testMatch: [
    "ci-public.spec.ts",
    "optical-render.spec.ts",
    "photo-actions.spec.ts",
    "web-kit-contract.spec.ts",
  ],
  reporter: [["line"], ["json", { outputFile: ".ci-evidence/browser.json" }]],
});
