import { defineConfig } from "@playwright/test";
import local from "./playwright.config";
const servers = Array.isArray(local.webServer)
  ? local.webServer
  : [local.webServer!];
// Separate suite/build: never silently turn existing local-engine QA into a
// different execution mode, and never reuse an owner preview/API.
export default defineConfig({
  ...local,
  testDir: "tests/protected-e2e",
  testMatch: "customer-protected.spec.ts",
  timeout: 240000,
  webServer: servers.map((server, index) =>
    index === 0
      ? { ...server, env: { ...server.env, SERVER_GENERATION: "1" } }
      : server,
  ),
});
