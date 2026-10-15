import { spawn } from "node:child_process";
import { randomBytes, verify, createPublicKey } from "node:crypto";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { freshTestDatabase } from "./test-artifacts.mjs";
const { directory, databasePath } = freshTestDatabase("kit-http"),
  port = 4448,
  base = `http://127.0.0.1:${port}/api`,
  admin = randomBytes(32).toString("base64url"),
  env = {
    ...process.env,
    IP_RASM_TEST_SERVER: "1",
    PORT: String(port),
    DATABASE_PATH: databasePath,
    LOCAL_ADMIN_TOKEN: admin,
    CODE_PEPPER: randomBytes(32).toString("base64url"),
    SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
  };
let child,
  checks = 0;
async function start() {
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(Error("Isolated kit service startup timeout")),
      15000,
    );
    child.once("error", reject);
    child.once("exit", () => reject(Error("Isolated kit service exited")));
    child.stdout.once("data", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
async function stop() {
  if (!child) return;
  const ended = new Promise((r) => child.once("exit", r));
  child.kill();
  await ended;
  child = null;
}
async function req(path, status, body, token) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(r.status, status, `Unexpected status ${path}`);
  checks++;
  return r.json();
}
try {
  await start();
  const key = await req("/builds/key", 200);
  assert.equal(key.kty, "OKP");
  assert.equal(key.d, undefined);
  await req("/builds/account", 401);
  await req("/admin/kits", 403);
  const policy = await req("/admin/kits", 200, undefined, admin);
  assert.equal(policy.policy.quota, 3);
  assert.equal(policy.policy.creditDays, 0);
  const profiles=await req("/kit-profiles",200);
  assert.equal(profiles.nails,240);assert.equal(profiles.circleDiameterMm,460);
  await req("/admin/kits/profiles",403,{...profiles,sectors:8});
  const changed=await req("/admin/kits/profiles",200,{...profiles,sectors:8},admin);
  assert.equal(changed.revision,profiles.revision+1);
  await req("/admin/kits/profiles",409,profiles,admin);
  await req("/admin/kits/profiles",400,{...changed,squareSideMm:460},admin);
  assert.equal((await req("/kit-profiles",200)).sectors,8);
  assert.equal((await req(`/kit-profiles/${profiles.revision}`,200)).sectors,4);
  assert.equal((await req(`/kit-profiles/${changed.revision}`,200)).sectors,8);
  await req("/kit-profiles/999999",404);
  await req("/admin/kits/policy",200,{...policy.policy,quota:4},admin);
  const batch = await req(
    "/admin/kits/batch",
    201,
    { profile: "test-board", count: 2, requestKey: "http-batch-1" },
    admin,
  );
  await req(
    "/admin/kits/batch",
    409,
    { profile: "test-board", count: 2, requestKey: "http-batch-1" },
    admin,
  );
  const a = await req("/account/kit", 200, { code: batch.codes[0].code });
  assert.equal(a.credits, 4);
  const again = await req("/account/kit", 200, { code: batch.codes[0].code });
  assert.equal(a.id, again.id);
  await req("/codes/redeem", 200, { code: batch.codes[0].code }, a.token);
  const b = await req("/session", 201, {});
  await req("/codes/redeem", 409, { code: batch.codes[0].code }, b.token);
  const body = {
      sequenceHash: "a".repeat(64),
      deviceId: "device-http-0123456789",
      requestKey: "http-unlock-1",
    },
    receipt = await req("/builds/unlock", 200, body, a.token);
  assert.equal(receipt.credits, 3);
  assert(
    verify(
      null,
      Buffer.from(JSON.stringify(receipt.receipt.payload)),
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(receipt.receipt.signature, "base64url"),
    ),
  );
  const duplicate = await req("/builds/unlock", 200, body, a.token);
  assert.equal(duplicate.credits, 3);
  assert.equal(duplicate.duplicate, true);
  await req(
    "/builds/unlock",
    409,
    { ...body, sequenceHash: "b".repeat(64) },
    a.token,
  );
  await req(
    "/builds/unlock",
    402,
    { ...body, requestKey: "http-no-credit" },
    b.token,
  );
  const staff = await req(
    "/admin/access",
    201,
    { name: "Support test", role: "support", days: 1 },
    admin,
  );
  await req("/admin/kits", 403, undefined, staff.token);
  await req("/admin/kits/policy", 403, policy.policy, staff.token);
  await req(
    "/admin/kits/limits",
    200,
    { accountId: a.id, limits: { buildsPerPeriod: 1 } },
    admin,
  );
  await req(
    "/builds/unlock",
    403,
    {
      ...body,
      sequenceHash: "b".repeat(64),
      requestKey: "http-period-blocked",
    },
    a.token,
  );
  await stop();
  await start();
  assert.deepEqual(await req("/builds/key", 200), key);
  const login = await req("/account/kit", 200, { code: batch.codes[0].code });
  assert.equal(login.id, a.id);
  assert.deepEqual(
    (await req("/builds/unlock", 200, body, login.token)).receipt,
    receipt.receipt,
  );
  const report = await req("/admin/kits", 200, undefined, admin);
  assert.equal(report.accounts[0].builds, 1);
  assert(!JSON.stringify(report).includes(batch.codes[0].code));
  await req("/admin/kits/revoke", 200, { id: batch.id }, admin);
  await req("/account/kit", 401, { code: batch.codes[1].code });
  // Account-guessing budget is separate from ordinary preview/generation and read traffic.
  for (let j = 0; j < 12; j++)
    await req("/account/kit", j < 10 ? 401 : 429, { code: "z".repeat(32) });
  writeFileSync(
    directory + "/report.json",
    JSON.stringify(
      { checks, passed: true, isolatedDatabase: true, port },
      null,
      2,
    ),
  );
  process.stdout.write(
    JSON.stringify({ checks, passed: true, directory }) + "\n",
  );
} finally {
  await stop();
}
