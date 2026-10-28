import { test, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
// @ts-expect-error Node-only snapshot helper has no browser type declaration
import * as snapshot from "../scripts/snapshot-server-runtime.mjs";
const { snapshotServerRuntime, inspectServerRuntime } = snapshot;
test("fresh worker keeps the frozen source and dependency after originals mutate; private root and mutable caches never copy", () => {
  mkdirSync("test-results", { recursive: true });
  const root = mkdtempSync(resolve("test-results/runtime-source-"));
  for (const path of [
    "server",
    "src",
    "node_modules/snapshot-probe",
    "node_modules/.vite",
    "node_modules/@capacitor/preferences/android/build",
  ])
    mkdirSync(join(root, path), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(join(root, "private-state.txt"), "must-not-be-snapshotted");
  writeFileSync(join(root, "node_modules/.vite/cache.json"), "mutable-cache");
  writeFileSync(
    join(
      root,
      "node_modules/@capacitor/preferences/android/build/transient.jar",
    ),
    "native-build-cache",
  );
  writeFileSync(
    join(root, "node_modules/snapshot-probe/package.json"),
    JSON.stringify({ type: "module", exports: "./index.js" }),
  );
  const dependency = join(root, "node_modules/snapshot-probe/index.js"),
    worker = join(root, "server/worker.mjs");
  writeFileSync(dependency, 'export const value="original-package";');
  writeFileSync(
    worker,
    'import{parentPort}from"node:worker_threads";import{value}from"snapshot-probe";parentPort.postMessage(value+"|original-worker");',
  );
  writeFileSync(
    join(root, "server/main.mjs"),
    'import{Worker}from"node:worker_threads";const w=new Worker(new URL("./worker.mjs",import.meta.url));w.once("message",v=>process.stdout.write(v));w.once("error",()=>process.exit(1));',
  );
  const target = resolve(
    "output/phase16-private/runtime-fixture-" +
      crypto.randomUUID() +
      "/runtime",
  );
  const result = snapshotServerRuntime(root, target);
  expect(result.files).toBe(5);
  expect(existsSync(join(target, "private-state.txt"))).toBe(false);
  expect(existsSync(join(target, "node_modules/.vite"))).toBe(false);
  expect(
    existsSync(
      join(target, "node_modules/@capacitor/preferences/android/build"),
    ),
  ).toBe(false);
  writeFileSync(worker, 'throw Error("workspace-worker-changed");');
  writeFileSync(dependency, 'export const value="changed-package";');
  const run = spawnSync(process.execPath, [join(target, "server/main.mjs")], {
    cwd: target,
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
  });
  expect(run.status).toBe(0);
  expect(run.stdout).toBe("original-package|original-worker");
  expect(
    JSON.parse(readFileSync(join(target, "runtime-snapshot.json"), "utf8"))
      .sha256,
  ).toBe(result.sha256);
  expect(inspectServerRuntime(target).sha256).toBe(result.sha256);
  expect(() => inspectServerRuntime(target, { sourceRoot: root })).toThrow(
    "Workspace runtime differs",
  );
  expect(() => snapshotServerRuntime(root, target)).toThrow(
    "Invalid private inventory output",
  );
});

test("even a self-consistent manifest cannot direct snapshot verification outside its source allowlist", () => {
  for (const path of [
    "../../tmp/data/owner.sqlite",
    "tmp/data/owner.sqlite",
    "server/../private-keys.json",
    "private-keys.json",
    "server/.env",
  ]) {
    const dir = resolve(
      "output/phase16-private/runtime-tamper-" + crypto.randomUUID(),
    );
    mkdirSync(dir, { recursive: true });
    const content = {
      schema: "iprasm.runtime-snapshot/1",
      files: [{ path, bytes: 0, sha256: "a".repeat(64) }],
      bytes: 0,
      nodeVersion: process.version,
    };
    writeFileSync(
      join(dir, "runtime-snapshot.json"),
      JSON.stringify({
        ...content,
        sha256: createHash("sha256")
          .update(JSON.stringify(content))
          .digest("hex"),
      }),
    );
    expect(() => inspectServerRuntime(dir, { verifyFiles: false })).toThrow(
      /Unsafe runtime file path|outside source allowlist/,
    );
  }
});

test("snapshot test API wrapper refuses owner ports before reading any runtime or opening data", () => {
  for (const [web, api] of [
    [4217, 5200],
    [4800, 4657],
    [4194, 5200],
  ]) {
    const run = spawnSync(process.execPath, ["scripts/run-snapshot-api.mjs"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000,
      env: {
        ...process.env,
        IP_RASM_TEST_SERVER: "1",
        IP_RASM_TEST_PORT: String(web),
        PORT: String(api),
        DATABASE_PATH: resolve(
          "test-results/snapshot-wrapper-not-opened.sqlite",
        ),
        IP_RASM_TEST_API_RUNTIME: "output/phase16-private/runtime-not-read",
      },
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("reserved");
  }
});
