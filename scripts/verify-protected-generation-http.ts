// Actual worker + HTTP + unchanged-engine parity. No owner photo or credentials.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { KitStore } from "../server/kit-store";
import { decodeGenerationRecipe } from "../server/generation-recipe";
import { freshTestDatabase } from "./test-artifacts.mjs";
import { assertTestPorts } from "../server/test-safety.mjs";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
import { generateClassicLeastSquares } from "../src/core/classic-least-squares";
import { validateInstruction } from "../src/core/validation";
import { previewPng } from "../src/core/preview-png";
const port = Number(process.env.PROTECTED_GENERATION_TEST_PORT ?? 4811);
assertTestPorts(port, port + 1);
await new Promise<void>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(port, "127.0.0.1", () => server.close(() => resolve()));
});
const { directory, databasePath } = freshTestDatabase(
    "protected-generation-http",
  ),
  pepper = randomBytes(32).toString("base64url"),
  admin = randomBytes(32).toString("base64url"),
  payment = randomBytes(32).toString("base64url"),
  store = new KitStore(databasePath, pepper, payment),
  codes = store
    .issueKitBatch("admin", "standard-kit-r1", 2, "protected-http-kit-batch")
    .codes.map((c) => c.code);
store.close();
const secret = randomBytes(32).toString("base64url"),
  mono = Buffer.alloc(250000);
for (let y = 0; y < 500; y++)
  for (let x = 0; x < 500; x++) {
    // Original procedural object, no personal data or licensed-asset dependency.
    const d = Math.hypot((x - 250) / 170, (y - 250) / 190);
    mono[y * 500 + x] = d < 1 ? Math.round(65 + 145 * (x / 500)) : 255;
  }
const body = {
  version: "protected-generation/1",
  consent: "prepared-target-transfer/1",
  shape: "circle",
  revision: 1,
  lines: 2500,
  target: mono.toString("base64url"),
  secret,
  requestKey: "protected-http-first-generation",
  preparation: {
    version: "standard-preparation/9",
    sourceHash: "a".repeat(64),
    sourceAspect: 1,
    whiteBackground: "original",
    transform: frameFreePhoto("object", [], "circle", 1),
  },
};
let child: ChildProcess | undefined,
  checks = 0,
  logs = "";
async function start(enabled = "1") {
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: {
      ...process.env,
      IP_RASM_TEST_SERVER: "1",
      SERVER_GENERATION: enabled,
      PORT: String(port),
      DATABASE_PATH: databasePath,
      LOCAL_ADMIN_TOKEN: admin,
      CODE_PEPPER: pepper,
      SANDBOX_PAYMENT_KEY: payment,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout!.on("data", (b) => {
    logs += b.toString();
  });
  child.stderr!.on("data", (b) => {
    logs += b.toString();
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Isolated generation startup timeout")),
      25000,
    );
    child!.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child!.once("exit", () => {
      clearTimeout(timer);
      reject(Error("Isolated generation startup exit"));
    });
    child!.stdout!.once("data", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const done = new Promise<void>((resolve) =>
    child!.once("exit", () => resolve()),
  );
  child.kill();
  await done;
  child = undefined;
}
async function req(
  path: string,
  expected: number,
  payload?: unknown,
  token?: string,
) {
  const r = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    method: payload === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  assert.equal(r.status, expected, "Protected generation status: " + path);
  checks++;
  return r.json();
}
try {
  await start();
  assert.equal((await req("/generation/config", 200)).enabled, true);
  await req("/generation/start?secret=canary-not-a-credential", 400, {});
  const began = performance.now(),
    job = await req("/generation/start", 202, body),
    capability = { id: job.id, secret };
  assert.equal((await req("/generation/start", 200, body)).id, job.id);
  await req("/generation/start", 409, { ...body, lines: 3000 });
  await req("/generation/status", 404, {
    id: job.id,
    secret: randomBytes(32).toString("base64url"),
  });
  await req("/generation/unlock", 401, {
    ...capability,
    deviceId: "protected-http-device-01234",
    requestKey: "protected-http-unauth",
  });
  let state: any;
  for (;;) {
    state = await req("/generation/status", 200, capability);
    assert(
      !("instruction" in state) &&
        !("segments" in state) &&
        !("steps" in state) &&
        !("target" in state),
    );
    if (state.status === "ready") break;
    assert(
      !["failed", "cancelled"].includes(state.status),
      "Actual generation worker failed",
    );
    assert(performance.now() - began < 60000, "Actual generation deadline");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const serverMilliseconds = performance.now() - began;
  const first = await req("/account/kit", 200, { code: codes[0] }),
    second = await req("/account/kit", 200, { code: codes[1] });
  const unlockBody = {
      ...capability,
      deviceId: "protected-http-device-01234",
      requestKey: "protected-http-unlock-first",
    },
    unlocked = await req("/generation/unlock", 200, unlockBody, first.token),
    guide = await validateInstruction(unlocked.instruction);
  assert.equal(unlocked.credits, 2);
  assert.equal(guide.sequenceHash, state.sequenceHash);
  await req("/generation/unlock", 404, unlockBody, second.token);
  assert.equal(
    (
      await req(
        "/generation/unlock",
        200,
        {
          ...unlockBody,
          deviceId: "protected-http-other-device",
          requestKey: "protected-http-reopen",
        },
        first.token,
      )
    ).credits,
    2,
  );
  // Sequential parity after the server worker has finished. Never run two fits.
  const expected = await generateClassicLeastSquares(
    decodeGenerationRecipe(body, DEFAULT_STANDARD_KIT).options,
  );
  assert.equal(
    guide.sequenceHash,
    expected.sequenceHash,
    "Exact unchanged-engine route parity",
  );
  assert(
    Buffer.from(state.preview, "base64").equals(
      Buffer.from(previewPng(expected)),
    ),
    "Exact physical PNG parity",
  );
  writeFileSync(
    join(directory, "static-preview.png"),
    Buffer.from(state.preview, "base64"),
  );
  await stop();
  await start();
  assert.equal(
    (await req("/generation/unlock", 200, unlockBody, first.token)).duplicate,
    true,
  );
  const cancelled = await req("/generation/start", 202, {
    ...body,
    requestKey: "protected-http-cancel",
  });
  await req("/generation/cancel", 200, { id: cancelled.id, secret });
  assert.equal(
    (await req("/generation/status", 200, { id: cancelled.id, secret })).status,
    "cancelled",
  );
  const interrupted = await req("/generation/start", 202, {
    ...body,
    requestKey: "protected-http-interrupted",
  });
  await stop();
  await start();
  assert.equal(
    (await req("/generation/status", 200, { id: interrupted.id, secret }))
      .status,
    "failed",
  );
  await stop();
  await start("0");
  assert.equal((await req("/generation/config", 200)).enabled, false);
  await req("/generation/start", 503, body);
  for (const value of [
    secret,
    admin,
    pepper,
    payment,
    first.token,
    second.token,
    ...codes,
    body.target,
  ])
    assert(!logs.includes(value), "Server logs contain private data");
  const report = {
    passed: true,
    checks,
    serverMilliseconds,
    localRouteParity: true,
    physicalPngParity: true,
    capabilityDenial: true,
    authenticatedUnlock: true,
    ownerBinding: true,
    crossDeviceReopenFree: true,
    restartPreservesPaidAccess: true,
    cancelFencesLateWork: true,
    unfinishedRestartFailed: true,
    disabledFailsClosed: true,
    privateValuesPrinted: false,
    ownerPhotosUsed: false,
    ordinaryUiVerified: false,
  };
  writeFileSync(
    join(directory, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ ...report, directory }));
} finally {
  // Test server logs never contain targets/tokens; still keep them ignored.
  writeFileSync(join(directory, "server.log"), logs);
  await stop();
}
