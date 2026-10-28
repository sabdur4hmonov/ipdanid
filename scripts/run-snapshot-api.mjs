// Test harness only: new isolated data/ports, immutable API source/dependencies.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertTestDatabasePath,
  assertTestPorts,
} from "../server/test-safety.mjs";
import { inspectServerRuntime } from "./snapshot-server-runtime.mjs";
assert.equal(
  process.env.IP_RASM_TEST_SERVER,
  "1",
  "Snapshot API wrapper requires isolated test mode",
);
assertTestPorts(
  Number(process.env.IP_RASM_TEST_PORT),
  Number(process.env.PORT),
);
assertTestDatabasePath(process.env.DATABASE_PATH);
const runtime = inspectServerRuntime(process.env.IP_RASM_TEST_API_RUNTIME, {
  verifyFiles: false,
});
console.log(
  JSON.stringify({
    apiRuntime: runtime.sha256,
    isolated: true,
    nodeVersion: process.version,
  }),
);
const loader = createRequire(join(runtime.directory, "package.json")).resolve(
  "tsx",
);
assert(
  loader.startsWith(join(runtime.directory, "node_modules")),
  "Test runtime loader escaped snapshot",
);
const env = {
  ...process.env,
  NODE_OPTIONS: "--max-old-space-size=512",
  TSX_TSCONFIG_PATH: join(runtime.directory, "tsconfig.json"),
};
delete env.ESBUILD_BINARY_PATH;
delete env.NODE_PATH;
const child = spawn(
  process.execPath,
  [
    "--import",
    pathToFileURL(loader).href,
    join(runtime.directory, "server/index.ts"),
  ],
  { cwd: runtime.directory, env, stdio: "inherit", windowsHide: true },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.on("error", () => {
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
