import { defineConfig, devices } from "@playwright/test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { assertTestDatabasePath } from "./server/test-safety.mjs";
const previewPort = Number(process.env.IP_RASM_TEST_PORT || 4183);
const apiPort = Number(process.env.IP_RASM_TEST_API_PORT || 4311);
for (const port of [previewPort, apiPort])
  if (
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    [4194, 4195, 4196, 4197, 4331, 4465, 4478, 4479].includes(port)
  )
    throw Error(
      "Invalid local test port (owner previews and APIs are reserved)",
    );
if (previewPort === apiPort) throw Error("Test ports must differ");
assertTestDatabasePath(process.env.DATABASE_PATH || ":memory:");
const artifacts = resolve(process.env.IP_RASM_TEST_ARTIFACTS || "test-results");
// Reject a protected artifacts root before creating even a test directory.
assertTestDatabasePath(join(artifacts, "test.sqlite"));
if (process.env.IP_RASM_TEST_REPORT)
  assertTestDatabasePath(process.env.IP_RASM_TEST_REPORT);
mkdirSync(artifacts, { recursive: true });
const database = join(mkdtempSync(join(artifacts, "api-")), "test.sqlite");
for (const name of [
  "LOCAL_ADMIN_TOKEN",
  "CODE_PEPPER",
  "SANDBOX_PAYMENT_KEY",
]) {
  const testName = `IP_RASM_TEST_${name}`;
  process.env[testName] ??= randomBytes(32).toString("base64url");
  process.env[name] = process.env[testName];
}
process.env.IP_RASM_TEST_API_URL = `http://127.0.0.1:${apiPort}`;
process.env.IP_RASM_BUSINESS_TEST = "isolated";
const channel = process.env.IP_RASM_TEST_BROWSER_CHANNEL;
const previewDir = process.env.IP_RASM_TEST_WEB_DIR || "dist";
if (!/^[a-zA-Z0-9_./-]+$/.test(previewDir) || previewDir.includes(".."))
  throw Error("Invalid test web directory");
assertTestDatabasePath(join(resolve(previewDir), "preview-safety.sqlite"));
if (channel && !["chrome", "msedge"].includes(channel))
  throw Error("IP_RASM_TEST_BROWSER_CHANNEL must be chrome or msedge");
export default defineConfig({
  outputDir: join(artifacts, "browser"),
  reporter: process.env.IP_RASM_TEST_REPORT
    ? [["line"], ["json", { outputFile: process.env.IP_RASM_TEST_REPORT }]]
    : undefined,
  testDir: "tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    actionTimeout: 15000,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run server",
      env: {
        PORT: String(apiPort),
        DATABASE_PATH: database,
        IP_RASM_TEST_SERVER: "1",
        IP_RASM_TEST_ORIGIN: `http://127.0.0.1:${previewPort}`,
        LOCAL_ADMIN_TOKEN: process.env.LOCAL_ADMIN_TOKEN!,
        CODE_PEPPER: process.env.CODE_PEPPER!,
        SANDBOX_PAYMENT_KEY: process.env.SANDBOX_PAYMENT_KEY!,
      },
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `npm run preview -- --outDir ${previewDir} --port ${previewPort} --strictPort`,
      env: { IP_RASM_BACKEND_PROXY: `http://127.0.0.1:${apiPort}` },
      url: `http://127.0.0.1:${previewPort}`,
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) },
    },
    {
      name: "mobile-browser",
      use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) },
    },
  ],
});
