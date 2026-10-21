import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import { freshTestDatabase } from "./test-artifacts.mjs";
import { hashAdminPassword } from "../server/production-auth.ts";
const isolated = freshTestDatabase("phase15-finance-production"),
  password = randomBytes(24).toString("base64url"),
  hash = await hashAdminPassword(password);
const probe = createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
assert(
  ![
    4194, 4195, 4196, 4197, 4198, 4199, 4200, 4331, 4465, 4478, 4479, 4480,
    4481, 4482, 4483,
  ].includes(port),
);
let logs = "";
const secret = randomBytes(32).toString("base64url"),
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_PATH: isolated.databasePath,
      APP_ORIGIN: "https://iprasm.example.invalid",
      ADMIN_PASSWORD_HASH: hash,
      CODE_PEPPER: secret,
      SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
      PAYMENTS_SANDBOX: "0",
      IP_RASM_TEST_SERVER: "1",
      FCM_MODE: "disabled",
      TRANSACTIONAL_EMAIL_MODE: "disabled",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
child.stdout.on("data", (d) => (logs += d));
child.stderr.on("data", (d) => (logs += d));
writeFileSync(
  isolated.directory + "/launch.json",
  JSON.stringify({ pid: child.pid, port }),
);
const call = async (path, data, token) => {
  const r = await fetch("http://127.0.0.1:" + port + "/api" + path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(data === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(data) }),
  });
  return { status: r.status, data: await r.json() };
};
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try {
      if ((await call("/health")).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "isolated production API readiness");
  const login = await call("/admin/login", { password });
  assert.equal(login.status, 200);
  const token = login.data.token;
  assert.equal(
    (await call("/admin/sandbox/sign", { event: {} }, token)).status,
    403,
    "production must refuse sandbox signing",
  );
  assert.equal(
    (await call("/sandbox/callback", {}, undefined)).status,
    403,
    "production must refuse the legacy sandbox callback",
  );
  assert.equal(
    (await call("/admin/orders/" + randomUUID() + "/test-payment", {}, token))
      .status,
    403,
    "production must refuse test settlement",
  );
  const batch = await call(
    "/admin/kits/batch",
    { profile: "cash-test", count: 1, requestKey: randomUUID() },
    token,
  );
  assert.equal(batch.status, 201);
  const customer = await call("/account/kit", {
    code: batch.data.codes[0].code,
  });
  assert.equal(customer.status, 200);
  const product = {
    id: "original-cash-art",
    name: "Original cash receipt fixture",
    family: "string",
    price_minor: 10000,
    currency: "UZS",
    stock: 2,
    credits: 0,
    description: "No real money",
    expectedRevision: 0,
    active: 1,
    profile_id: "board",
  };
  assert.equal((await call("/admin/products", product, token)).status, 200);
  const settings = await call("/admin/settings", undefined, token);
  assert.equal(
    (
      await call(
        "/admin/settings",
        { ...settings.data, pickupAddress: "Original mock workshop" },
        token,
      )
    ).status,
    200,
  );
  const storefront = await call("/storefront"),
    catalog = await call("/catalog");
  const placed = await call(
    "/orders",
    {
      items: [{ productId: product.id, quantity: 1 }],
      address: {
        name: "Synthetic cash customer",
        phone: "+998901234567",
        city: "",
        street: "",
        country: "UZ",
        deliveryMethod: "pickup",
      },
      requestKey: randomUUID(),
      quote: {
        totalMinor: 10000,
        currency: "UZS",
        catalogRevision: catalog.data.catalogRevision,
        settingsRevision: storefront.data.settings.revision,
        shippingRevision: catalog.data.regions.revision,
      },
    },
    customer.data.token,
  );
  assert.equal(placed.status, 201);
  const body = {
    requestKey: randomUUID(),
    received: true,
    amountMinor: 10000,
    currency: "UZS",
    reference: "SYNTHETIC-CASH-1",
  };
  assert.equal(
    (
      await call(
        "/admin/finance/orders/" + placed.data.id + "/receipt",
        body,
        customer.data.token,
      )
    ).status,
    403,
  );
  const received = await call(
    "/admin/finance/orders/" + placed.data.id + "/receipt",
    body,
    token,
  );
  assert.equal(received.status, 200);
  assert.equal(received.data.bankVerified, false);
  assert.equal(received.data.order.status, "paid");
  assert.equal(
    (
      await call(
        "/admin/finance/orders/" + placed.data.id + "/receipt",
        body,
        token,
      )
    ).data.duplicate,
    true,
  );
  assert.equal(
    (
      await call(
        "/admin/finance/orders/" + placed.data.id + "/receipt",
        { ...body, amountMinor: 1 },
        token,
      )
    ).status,
    409,
  );
  const report = await call("/admin/finance/reconciliation", undefined, token);
  assert.equal(report.status, 200);
  assert.equal(report.data.bankVerified, false);
  assert.equal(
    report.data.orders.find((o) => o.id === placed.data.id).settlement,
    "manual",
  );
  for (const value of [
    password,
    hash,
    secret,
    token,
    customer.data.token,
    batch.data.codes[0].code,
  ])
    assert(!logs.includes(value), "startup logs must not contain credentials");
  writeFileSync(
    isolated.directory + "/report.json",
    JSON.stringify(
      {
        passed: true,
        production: true,
        sandboxEndpointsDenied: 3,
        manualReceipt: true,
        exactRetry: true,
        wrongAmountDenied: true,
        customerDenied: true,
        bankVerified: false,
        realMoney: false,
        secretLogs: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: true,
      report: isolated.directory + "/report.json",
    }),
  );
} finally {
  if (child.exitCode === null) child.kill();
  await Promise.race([
    new Promise((r) => child.once("exit", r)),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
}
