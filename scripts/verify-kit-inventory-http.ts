// Real API regression, fresh isolated database; never prints credentials/codes.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { KitStore } from "../server/kit-store";
import { KitInventory } from "../server/kit-inventory";
import { freshTestDatabase } from "./test-artifacts.mjs";
import { assertTestPorts } from "../server/test-safety.mjs";

const port = Number(process.env.KIT_INVENTORY_TEST_PORT ?? 4805);
assertTestPorts(port + 1, port);
// Check OS binding before contacting HTTP: never accidentally hit another API.
await new Promise<void>((resolve, reject) => {
  const check = createServer();
  check.once("error", reject);
  check.listen(port, "127.0.0.1", () => check.close(() => resolve()));
});
const { directory, databasePath } = freshTestDatabase("inventory-http"),
  pepper = randomBytes(32).toString("base64url"),
  paymentKey = randomBytes(32).toString("base64url"),
  admin = randomBytes(32).toString("base64url"),
  store = new KitStore(databasePath, pepper, paymentKey),
  inventory = new KitInventory(store),
  staged = inventory.begin(
    "admin",
    "standard-kit-r1",
    1,
    "http-staged-inventory",
  ),
  ready = inventory.begin(
    "admin",
    "standard-kit-r1",
    2,
    "http-ready-inventory",
  );
let stagedCode = "";
const readyCodes: string[] = [];
inventory.append(staged.id, 1, (codes) => {
  stagedCode = codes[0].code;
});
inventory.append(ready.id, 2, (codes) =>
  readyCodes.push(...codes.map((c) => c.code)),
);
inventory.activate(ready.id);
store.close();
let child: ChildProcess | undefined,
  checks = 0,
  serverOutput = "";
async function start() {
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: {
      ...process.env,
      IP_RASM_TEST_SERVER: "1",
      PORT: String(port),
      DATABASE_PATH: databasePath,
      LOCAL_ADMIN_TOKEN: admin,
      CODE_PEPPER: pepper,
      SANDBOX_PAYMENT_KEY: paymentKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout!.on("data", (b) => {
    serverOutput += b.toString();
  });
  child.stderr!.on("data", (b) => {
    serverOutput += b.toString();
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Isolated inventory API startup timed out")),
      20000,
    );
    child!.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child!.once("exit", () => {
      clearTimeout(timer);
      reject(Error("Isolated inventory API exited"));
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
  status: number,
  body?: unknown,
  token?: string,
) {
  const r = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(r.status, status, "Inventory API status: " + path);
  checks++;
  return r.json();
}
try {
  await start();
  await req("/account/kit", 401, { code: stagedCode });
  await req("/admin/kits", 403);
  const summary = await req("/admin/kits", 200, undefined, admin);
  assert.equal(
    summary.inventories.find((x: any) => x.id === ready.id).issued,
    2,
  );
  assert.equal(
    summary.inventories.find((x: any) => x.id === staged.id).status,
    "staging",
  );
  for (const secret of [pepper, paymentKey, ...readyCodes, stagedCode])
    assert(
      !JSON.stringify(summary).includes(secret),
      "Admin summary must not expose credentials",
    );
  const a = await req("/account/kit", 200, { code: readyCodes[0] }),
    b = await req("/account/kit", 200, { code: readyCodes[1] });
  assert.equal(a.credits, 3);
  assert.equal(b.credits, 3);
  await req("/codes/redeem", 409, { code: readyCodes[0] }, b.token);
  const body = {
    sequenceHash: "a".repeat(64),
    deviceId: "inventory-http-device-01234",
    requestKey: "inventory-http-first",
  };
  for (const [i, c] of ["a", "b", "c"].entries()) {
    const unlocked = await req(
      "/builds/unlock",
      200,
      {
        ...body,
        sequenceHash: c.repeat(64),
        requestKey: "inventory-http-guide-" + i,
      },
      a.token,
    );
    assert.equal(unlocked.credits, 2 - i);
  }
  await req(
    "/builds/unlock",
    402,
    {
      ...body,
      sequenceHash: "d".repeat(64),
      requestKey: "inventory-http-fourth",
    },
    a.token,
  );
  const again = await req(
    "/builds/unlock",
    200,
    { ...body, deviceId: "inventory-http-another-device" },
    a.token,
  );
  assert.equal(again.duplicate, true);
  assert.equal(again.credits, 0);
  await req(
    "/admin/kits/batch",
    400,
    {
      count: 1000000,
      profile: "standard-kit-r1",
      requestKey: "inventory-no-http-million",
    },
    admin,
  );
  await stop();
  await start();
  const restored = await req("/account/kit", 200, { code: readyCodes[0] });
  assert.equal(restored.id, a.id);
  assert.equal(restored.credits, 0);
  assert.equal(
    (await req("/builds/unlock", 200, body, restored.token)).duplicate,
    true,
  );
  await req("/account/kit", 401, { code: stagedCode });
  for (const secret of [
    admin,
    pepper,
    paymentKey,
    a.token,
    b.token,
    ...readyCodes,
    stagedCode,
  ])
    assert(
      !serverOutput.includes(secret),
      "Server logs must not expose credentials",
    );
  writeFileSync(
    join(directory, "report.json"),
    JSON.stringify(
      {
        passed: true,
        checks,
        restart: true,
        stagedBlocked: true,
        quota: 3,
        fourthRefused: true,
        valuesPrinted: false,
        port,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: true, checks, directory, valuesPrinted: false }),
  );
} finally {
  await stop();
}
