import { afterEach, expect, it } from "vitest";
import { generateKeyPairSync, verify, randomUUID } from "node:crypto";
import { CustomerStore } from "../server/customer-store";
import {
  FcmAdapter,
  MockPushAdapter,
  PushFailure,
  pushAdapter,
} from "../server/fcm-adapter";
import { PushStore } from "../server/push-store";
import type { Announcement } from "../src/business-types";
const stores: CustomerStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
const now = 1800000000000;
function setup(kind: "news" | "promotion" = "news") {
  const s = new CustomerStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  const a: Announcement = {
    id: randomUUID(),
    revision: 1,
    title: "Local news",
    body: "Only mock delivery",
    kind,
    active: true,
    startsAt: now - 1000,
    endsAt: now + 2 * 86400000,
  };
  const adapter = new MockPushAdapter(),
    p = new PushStore(s, "p".repeat(32), adapter, (id) =>
      id === a.id ? a : undefined,
    ),
    u = s.createGuest().id,
    v = s.createGuest().id;
  const input = {
    installationId: randomUUID(),
    installationSecret: "s".repeat(43),
    token: "opaque-device-token-for-unit-test",
    platform: "android",
    locale: "uz",
    promotions: false,
    consent: true,
  };
  return {
    s,
    a,
    adapter,
    p,
    u,
    v,
    input,
    enqueue: () =>
      p.enqueue(
        "owner",
        { announcementId: a.id, requestKey: randomUUID() },
        now,
      ),
  };
}
it("keeps raw tokens encrypted, rotates only with installation proof and isolates accounts", () => {
  const { s, p, u, v, input } = setup();
  p.register(u, input, now);
  expect(
    JSON.stringify(s.db.prepare("SELECT * FROM push_devices").all()),
  ).not.toContain(input.token);
  expect(JSON.stringify(p.list(u))).not.toMatch(/token|secret|cipher/);
  expect(p.list(v)).toEqual([]);
  expect(() =>
    p.register(v, { ...input, installationSecret: "x".repeat(43) }, now),
  ).toThrow(/ownership/);
  expect(() =>
    p.register(v, { ...input, installationId: randomUUID() }, now),
  ).toThrow(/belongs/);
  expect(() => p.revoke(v, input)).toThrow();
  p.register(v, { ...input, token: input.token + "-rotated" }, now + 1);
  expect(p.list(u)).toHaveLength(0);
  expect(p.list(v)).toHaveLength(1);
  p.revokeAccount(v);
  expect(s.db.prepare("SELECT cipher FROM push_devices").get()!.cipher).toBe(
    "",
  );
});
it("refuses unknown fields, absent consent, invalid locales, oversized tokens and too many devices", () => {
  const { p, u, input } = setup();
  for (const bad of [
    { consent: false },
    { locale: "ar" },
    { token: "x" },
    { token: "x".repeat(4097) },
    { arbitrary: true },
  ])
    expect(() => p.register(u, { ...input, ...bad }, now)).toThrow();
  for (let i = 0; i < 10; i++)
    p.register(
      u,
      { ...input, installationId: randomUUID(), token: input.token + i },
      now,
    );
  expect(() => p.register(u, input, now)).toThrow(/Too many/);
  expect(() =>
    pushAdapter({
      FCM_MODE: "mock",
      NODE_ENV: "production",
      IP_RASM_TEST_SERVER: "1",
    }),
  ).toThrow();
  const disabled = new PushStore(
    stores[0],
    "p".repeat(32),
    pushAdapter({}),
    () => undefined,
  );
  expect(() => disabled.register(u, input)).toThrow(/not configured/);
});
it("idempotent enqueue and revocation/revision/token fences prevent stale announcements", async () => {
  const { p, a, input, u, adapter } = setup();
  p.register(u, input, now);
  const b = { announcementId: a.id, requestKey: randomUUID() },
    first = p.enqueue("owner", b, now);
  expect(p.enqueue("owner", b, now)).toMatchObject({
    batchId: first.batchId,
    duplicate: true,
  });
  a.revision++;
  expect(() => p.enqueue("owner", b, now)).toThrow(/changed/);
  await p.drain(now);
  expect(adapter.sent).toHaveLength(0);
  p.enqueue("owner", { ...b, requestKey: randomUUID() }, now);
  p.register(u, { ...input, token: input.token + "-2" }, now);
  await p.drain(now);
  expect(adapter.sent).toHaveLength(0);
  p.enqueue("owner", { ...b, requestKey: randomUUID() }, now);
  p.revoke(u, {
    installationId: input.installationId,
    installationSecret: input.installationSecret,
  });
  await p.drain(now);
  expect(adapter.sent).toHaveLength(0);
});
it("schedules news, requires separate promotion consent and cancels revoked/expired/stale devices", async () => {
  const { p, a, input, u, adapter, enqueue } = setup("promotion");
  p.register(u, input, now);
  enqueue();
  await p.drain(now);
  expect(adapter.sent).toHaveLength(0);
  p.register(u, { ...input, promotions: true }, now);
  a.startsAt = now + 1000;
  enqueue();
  await p.drain(now);
  expect(adapter.sent).toHaveLength(0);
  await p.drain(now + 1000);
  expect(adapter.sent).toHaveLength(1);
  expect(p.status().counts).toContainEqual({ state: "mock_sent", count: 1 });
  enqueue();
  a.active = false;
  await p.drain(now + 1000);
  expect(adapter.sent).toHaveLength(1);
  a.active = true;
  a.endsAt = now + 2000;
  enqueue();
  await p.drain(now + 3000);
  expect(adapter.sent).toHaveLength(1);
  a.endsAt = now + 100 * 86400000;
  enqueue();
  await p.drain(now + 91 * 86400000);
  expect(adapter.sent).toHaveLength(1);
});
it("durably retries at most five attempts, reclaims leases and clears invalid tokens", async () => {
  const { p, s, input, u, adapter, enqueue } = setup();
  p.register(u, input, now);
  enqueue();
  let calls = 0;
  adapter.send = async () => {
    calls++;
    throw new PushFailure(true);
  };
  await p.drain(now);
  await p.drain(now + 1000);
  expect(calls).toBe(1);
  for (const t of [60000, 180000, 420000, 900000]) await p.drain(now + t);
  expect(calls).toBe(5);
  expect(p.status().counts).toContainEqual({ state: "failed", count: 1 });
  enqueue();
  s.db
    .prepare(
      "UPDATE push_deliveries SET state='sending',attempts=1,lease_until=? WHERE state='queued'",
    )
    .run(now + 100);
  adapter.send = async () => {
    calls++;
    throw new PushFailure(false, true);
  };
  await p.drain(now + 101);
  expect(calls).toBe(6);
  expect(s.db.prepare("SELECT active,cipher FROM push_devices").get()).toEqual({
    active: 0,
    cipher: "",
  });
});
it("signs OAuth JWT correctly, coalesces token requests and sends only fixed HTTPS endpoints", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const config = {
    project: "iprasm-unit-project",
    email: "test@iprasm-unit-project.iam.gserviceaccount.com",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    origin: "https://app.example.test",
  };
  let auth = 0,
    sends = 0,
    clock = now;
  const adapter = new FcmAdapter(
    config,
    async (url, init) => {
      if (url === "https://oauth2.googleapis.com/token") {
        auth++;
        const assertion = new URLSearchParams(String(init!.body)).get(
            "assertion",
          )!,
          [header, body, signature] = assertion.split(".");
        expect(
          verify(
            "RSA-SHA256",
            Buffer.from(header + "." + body),
            publicKey,
            Buffer.from(signature, "base64url"),
          ),
        ).toBe(true);
        expect(
          JSON.parse(Buffer.from(body, "base64url").toString()),
        ).toMatchObject({
          iss: config.email,
          iat: clock / 1000,
          exp: clock / 1000 + 3600,
          aud: url,
        });
        return Response.json({
          access_token: "only-unit-access-token",
          expires_in: 3600,
        });
      }
      sends++;
      expect(url).toBe(
        "https://fcm.googleapis.com/v1/projects/iprasm-unit-project/messages:send",
      );
      const message = JSON.parse(String(init!.body)).message;
      expect(message.webpush.fcm_options.link).toBe(config.origin + "/");
      expect(message.android.ttl).toBe("60s");
      return Response.json({
        name: "projects/iprasm-unit-project/messages/unit",
      });
    },
    () => clock,
  );
  const m = {
    token: "unit-device",
    title: "News",
    body: "Only fake fetch",
    tag: "revision1",
    ttl: 60,
  };
  await Promise.all([adapter.send(m), adapter.send(m)]);
  expect(auth).toBe(1);
  expect(sends).toBe(2);
  clock += 3600000;
  await adapter.send(m);
  expect(auth).toBe(2);
});
it("sanitizes provider failures without leaking secrets and revokes only explicit UNREGISTERED tokens", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let code = "UNREGISTERED",
    status = 404;
  const a = new FcmAdapter(
    {
      project: "iprasm-unit-project",
      email: "test@test.iam.gserviceaccount.com",
      privateKey: privateKey
        .export({ type: "pkcs8", format: "pem" })
        .toString(),
      origin: "https://app.example.test",
    },
    async (url) =>
      url.includes("oauth2")
        ? Response.json({
            access_token: "secret-access-token",
            expires_in: 3600,
          })
        : Response.json(
            {
              error: {
                message: "secret-token-provider-detail",
                details: [{ errorCode: code }],
              },
            },
            { status },
          ),
  );
  const m = {
    token: "secret-device-token",
    title: "News",
    body: "Unit",
    tag: "revision",
    ttl: 10,
  };
  await expect(a.send(m)).rejects.toMatchObject({
    invalidToken: true,
    retryable: false,
    message: "Push provider request failed",
  });
  code = "INVALID_ARGUMENT";
  status = 400;
  await expect(a.send(m)).rejects.toMatchObject({
    invalidToken: false,
    retryable: false,
  });
  status = 429;
  await expect(a.send(m)).rejects.toMatchObject({
    invalidToken: false,
    retryable: true,
    retryAfterMs: 60000,
  });
});
