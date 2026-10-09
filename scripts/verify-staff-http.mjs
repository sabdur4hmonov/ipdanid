import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const directory = `tmp/staff-http-${randomUUID()}`,
  port = 4322,
  owner = randomBytes(32).toString("base64url");
mkdirSync(directory, { recursive: true });
const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_PATH: `${directory}/test.sqlite`,
    LOCAL_ADMIN_TOKEN: owner,
    CODE_PEPPER: randomBytes(32).toString("base64url"),
    SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let checks = 0;
async function request(path, status, token = owner, body) {
  const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, status, path);
  checks++;
  return response.json();
}
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error("Startup timeout")), 15000);
    child.once("error", reject);
    child.once("exit", () => reject(Error("Service exited")));
    child.stdout.once("data", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  const user = await request("/session", 201, undefined, {});
  await request("/admin/session", 403, user.token);
  const ticket = await request("/support", 201, user.token, {
    subject: "Synthetic staff isolation",
    body: "No real communication.",
  });
  const order = await request("/orders", 201, user.token, {
    items: [{ productId: "dev-circle", quantity: 1 }],
    address: {
      name: "Synthetic",
      city: "Tashkent",
      street: "Local test street",
    },
    requestKey: "staff-order",
  });
  const grants = {};
  for (const role of [
    "catalog",
    "support",
    "fulfillment",
    "finance",
    "codes",
    "manager",
  ])
    grants[role] = await request("/admin/access", 201, owner, {
      name: `Synthetic ${role}`,
      role,
      days: 1,
    });
  const domains = {
    products: ["catalog", "manager"],
    orders: ["fulfillment", "finance", "manager"],
    support: ["support", "manager"],
    codes: ["codes", "manager"],
    audit: ["manager"],
  };
  for (const [role, grant] of Object.entries(grants)) {
    const session = await request("/admin/session", 200, grant.token);
    assert.equal(session.id, grant.id);
    for (const [domain, allowed] of Object.entries(domains))
      await request(
        `/admin/${domain}`,
        allowed.includes(role) ? 200 : 403,
        grant.token,
      );
    await request("/admin/access", 403, grant.token);
    await request("/admin/access", 403, grant.token, {
      name: "Forged owner",
      role: "manager",
      days: 1,
    });
  }
  await request(
    `/admin/support/${ticket.id}/reply`,
    200,
    grants.support.token,
    { body: "Synthetic permitted reply", state: "answered" },
  );
  await request(
    `/admin/orders/${order.id}/test-payment`,
    403,
    grants.fulfillment.token,
    {},
  );
  await request(
    `/admin/orders/${order.id}/test-payment`,
    200,
    grants.finance.token,
    {},
  );
  await request(
    `/admin/orders/${order.id}/fulfill`,
    403,
    grants.finance.token,
    { tracking: "TEST" },
  );
  await request(
    `/admin/orders/${order.id}/fulfill`,
    200,
    grants.fulfillment.token,
    { tracking: "TEST" },
  );
  await request(`/admin/access/${grants.support.id}/revoke`, 200, owner, {});
  await request("/admin/support", 403, grants.support.token);
  const audit = await request("/admin/audit", 200);
  assert(
    audit.some(
      (e) => e.actor_id === grants.support.id && e.action === "ticket.reply",
    ),
  );
  assert(
    audit.some(
      (e) =>
        e.actor_id === grants.fulfillment.id &&
        e.action === "order.fulfill-sandbox",
    ),
  );
  const list = await request("/admin/access", 200);
  assert(!JSON.stringify(list).includes(grants.finance.token));
  assert(!JSON.stringify(audit).includes(grants.finance.token));
  const evidence = {
    checks,
    isolatedDatabase: true,
    roles: 6,
    serverAuthorization: true,
    revocation: true,
    secretsReturnedInAudit: false,
    realPayments: false,
    realMessages: false,
  };
  mkdirSync("output/completion", { recursive: true });
  writeFileSync(
    "output/completion/staff-http.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
} finally {
  child.kill();
}
