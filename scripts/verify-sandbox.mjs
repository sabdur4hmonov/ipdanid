import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const admin = randomBytes(32).toString("base64url");
const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: {
    ...process.env,
    IP_RASM_TEST_SERVER: "1",
    LOCAL_ADMIN_TOKEN: admin,
    CODE_PEPPER: randomBytes(32).toString("base64url"),
    SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
    DATABASE_PATH: ":memory:",
    PORT: "4322",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
const base = "http://127.0.0.1:4322";
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Sandbox startup timeout")),
      15000,
    );
    child.stdout.on("data", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.on("error", reject);
    child.on("exit", (code) => reject(new Error(`Sandbox exited ${code}`)));
  });
  const request = async (path, body, token) => {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const health = await request("/api/health");
  assert.equal(health.body.livePayments, false);
  const a = await request("/api/session", {}),
    b = await request("/api/session", {});
  assert.equal(a.status, 201);
  const forbidden = await request(
    "/api/admin/codes",
    { profile: "dev-circle", quota: 1, expiresAt: Date.now() + 60000 },
    a.body.token,
  );
  assert.equal(forbidden.status, 403);
  const code = await request(
    "/api/admin/codes",
    { profile: "dev-circle", quota: 1, expiresAt: Date.now() + 60000 },
    admin,
  );
  assert.equal(code.status, 201);
  const redeem = await request(
    "/api/codes/redeem",
    { code: code.body.code },
    a.body.token,
  );
  assert.equal(redeem.body.balance, 1);
  const stolen = await request(
    "/api/codes/redeem",
    { code: code.body.code },
    b.body.token,
  );
  assert.equal(stolen.status, 409);
  const order = await request(
    "/api/orders",
    {
      items: [{ productId: "dev-circle", quantity: 1, priceMinor: 1 }],
      address: {
        name: "Sandbox Maker",
        city: "Tashkent",
        street: "Development street",
      },
      requestKey: randomUUID(),
    },
    a.body.token,
  );
  assert.equal(order.body.total_minor, 550000);
  const denied = await request(
    `/api/orders/${order.body.id}`,
    null,
    b.body.token,
  );
  assert.equal(denied.status, 404);
  const event = {
    eventId: randomUUID(),
    orderId: order.body.id,
    amountMinor: 550000,
    currency: "UZS",
    status: "paid",
    timestamp: Date.now(),
  };
  const signed = await request("/api/admin/sandbox/sign", { event }, admin);
  const callback = async () =>
    fetch(base + "/api/sandbox/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sandbox-Signature": signed.body.signature,
      },
      body: signed.body.raw,
    });
  assert.equal((await callback()).status, 200);
  assert.equal((await callback()).status, 200);
  const credits = await request("/api/credits", null, a.body.token);
  assert.equal(credits.body.credits, 2);
  const gift = await request(
    "/api/gifts",
    { credits: 1, expiresAt: Date.now() + 60000, requestKey: randomUUID() },
    a.body.token,
  );
  assert.equal(gift.status, 201);
  const redeemedGift = await request(
    "/api/gifts/redeem",
    { claimToken: gift.body.claimToken },
    b.body.token,
  );
  assert.equal(redeemedGift.status, 200);
  const retryGift = await request(
    "/api/gifts/redeem",
    { claimToken: gift.body.claimToken },
    b.body.token,
  );
  assert.equal(retryGift.body.alreadyRedeemed, true);
  const deniedGift = await request(
    "/api/gifts/redeem",
    { claimToken: gift.body.claimToken },
    a.body.token,
  );
  assert.equal(deniedGift.status, 409);
  assert.equal(
    (await request("/api/credits", null, a.body.token)).body.credits,
    1,
  );
  assert.equal(
    (await request("/api/credits", null, b.body.token)).body.credits,
    1,
  );
  const messages = await request("/api/admin/messages", {}, admin);
  assert.equal(messages.body.sent, false);
  const ticket = await request(
    "/api/support",
    {
      subject: "Assembly help",
      body: "Local sandbox ticket",
      orderId: order.body.id,
    },
    a.body.token,
  );
  assert.equal(ticket.body.delivery, "local-only");
  mkdirSync("output/evidence", { recursive: true });
  writeFileSync(
    "output/evidence/sandbox-http.json",
    JSON.stringify(
      {
        passed: true,
        livePayments: false,
        liveMessages: false,
        checks: [
          "admin denied",
          "opaque guest auth",
          "code ownership",
          "server price ignores client tampering",
          "order isolation",
          "signed synthetic callback",
          "idempotent grant",
          "gift transfer and duplicate recipient protection",
          "no sent message claim",
          "local ticket",
        ],
        date: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "Sandbox HTTP verification passed; all events synthetic, no messages sent.",
  );
} finally {
  child.kill();
}
