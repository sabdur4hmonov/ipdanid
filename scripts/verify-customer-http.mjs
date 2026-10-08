import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { generate } from "../src/core/engine.ts";
import { createProfile } from "../src/core/geometry.ts";
import { progressFor } from "../src/core/validation.ts";

const port = 4321,
  base = `http://127.0.0.1:${port}/api`,
  directory = `tmp/customer-http-${randomUUID()}`;
mkdirSync(directory, { recursive: true });
const admin = randomBytes(32).toString("base64url");
const env = {
  ...process.env,
  PORT: String(port),
  DATABASE_PATH: `${directory}/database.sqlite`,
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
      () => reject(new Error("Isolated service startup timeout")),
      15000,
    );
    child.once("error", reject);
    child.once("exit", () =>
      reject(new Error("Isolated service exited before startup")),
    );
    child.stdout.once("data", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
async function stop() {
  if (!child) return;
  const ended = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await ended;
  child = null;
}
async function request(path, status, { body, token, origin } = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, status, `Unexpected status for ${path}`);
  checks++;
  return response.json();
}
try {
  await start();
  await request("/account", 401);
  await request("/admin/orders", 403);
  await request("/session", 403, {
    body: {},
    origin: "https://untrusted.example",
  });
  const guest = await request("/session", 201, { body: {} }),
    other = await request("/session", 201, { body: {} });
  const user = await request("/account/register", 201, {
    token: guest.token,
    body: { email: "http@example.com", password: "http test password only" },
  });
  await request("/account", 401, { token: guest.token });
  await request("/admin/products", 403, { token: user.token });
  const issued = await request("/admin/codes", 201, {
    token: admin,
    body: {
      profile: "dev-circle-120-dark",
      quota: 3,
      expiresAt: Date.now() + 60000,
    },
  });
  await request("/codes/redeem", 200, {
    token: user.token,
    body: { code: issued.code },
  });
  await request("/codes/redeem", 409, {
    token: other.token,
    body: { code: issued.code },
  });
  const instruction = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
  });
  const job = await request("/jobs/reserve", 200, {
    token: user.token,
    body: { requestKey: "upload", sequenceHash: instruction.sequenceHash },
  });
  const completed = await request("/jobs/finish", 200, {
    token: user.token,
    body: { jobId: job.id, instruction },
  });
  await request(`/instructions/${completed.instructionId}`, 404, {
    token: other.token,
  });
  await request(`/instructions/${completed.instructionId}/progress`, 404, {
    token: other.token,
  });
  const saved = await request(
    `/instructions/${completed.instructionId}/progress`,
    200,
    {
      token: user.token,
      body: {
        progress: { ...progressFor(instruction), confirmed: 3 },
        expectedRevision: 0,
      },
    },
  );
  await request(`/instructions/${completed.instructionId}/progress`, 409, {
    token: user.token,
    body: { progress: { ...saved, confirmed: 4 }, expectedRevision: 0 },
  });
  const payload = {
    items: [{ productId: "dev-circle", quantity: 1 }],
    address: {
      name: "HTTP Maker",
      city: "Tashkent",
      street: "Local test address",
    },
    requestKey: "order",
  };
  const order = await request("/orders", 201, {
    token: user.token,
    body: payload,
  });
  await request("/orders", 409, {
    token: user.token,
    body: { ...payload, address: { ...payload.address, city: "Changed city" } },
  });
  await request(`/orders/${order.id}`, 404, { token: other.token });
  await request(`/admin/orders/${order.id}/test-payment`, 403, {
    token: user.token,
    body: {},
  });
  await request(`/admin/orders/${order.id}/test-payment`, 200, {
    token: admin,
    body: {},
  });
  await request(`/admin/orders/${order.id}/fulfill`, 200, {
    token: admin,
    body: { tracking: "TEST-HTTP-ONLY" },
  });
  await request(`/orders/${order.id}/return`, 404, {
    token: other.token,
    body: {},
  });
  await request(`/orders/${order.id}/return`, 200, {
    token: user.token,
    body: {},
  });
  await request(`/admin/orders/${order.id}/refund`, 200, {
    token: admin,
    body: {},
  });
  const ticket = await request("/support", 201, {
    token: user.token,
    body: { subject: "HTTP test", body: "Private owner ticket" },
  });
  await request(`/admin/support/${ticket.id}/reply`, 403, {
    token: other.token,
    body: { body: "Unauthorized", state: "answered" },
  });
  await request(`/admin/support/${ticket.id}/reply`, 200, {
    token: admin,
    body: { body: "Private administrator reply", state: "answered" },
  });
  assert.equal(
    (await request("/support", 200, { token: other.token })).length,
    0,
  );
  await stop();
  await start();
  assert.equal(
    (await request("/account", 200, { token: user.token })).email,
    user.email,
  );
  assert.equal(
    (
      await request(`/instructions/${completed.instructionId}/progress`, 200, {
        token: user.token,
      })
    ).confirmed,
    3,
  );
  assert.equal(
    (await request("/support", 200, { token: user.token }))[0].replies[0].body,
    "Private administrator reply",
  );
  const recovered = await request("/account/recover", 200, {
    body: {
      email: user.email,
      recoveryKey: user.recoveryKey,
      password: "replacement HTTP password",
    },
  });
  await request("/account", 401, { token: user.token });
  await request("/account", 200, { token: recovered.token });
  await request("/account/recover", 401, {
    body: {
      email: user.email,
      recoveryKey: user.recoveryKey,
      password: "replacement HTTP password",
    },
  });
  mkdirSync("output/product-evidence", { recursive: true });
  writeFileSync(
    "output/product-evidence/customer-http.json",
    JSON.stringify(
      {
        checks,
        passed: true,
        persistentRestartVerified: true,
        realProviderActive: false,
        privatePhotoUploaded: false,
      },
      null,
      2,
    ),
  );
  console.log(
    `${checks} isolated HTTP outcomes passed, including restart recovery and ownership.`,
  );
} finally {
  await stop();
}
