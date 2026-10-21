import { afterEach, expect, it } from "vitest";
import { createServer, type Server, type RequestListener } from "node:http";
import { randomUUID } from "node:crypto";
import {
  emailAdapter,
  MockEmailAdapter,
  ResendEmailAdapter,
} from "../server/email-adapter";
const servers: Server[] = [];
afterEach(async () => {
  for (const s of servers.splice(0)) {
    s.closeAllConnections();
    await new Promise<void>((r) => s.close(() => r()));
  }
});
async function mock(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error("Expected loopback port");
  return new ResendEmailAdapter(
    "synthetic-unit-key-only",
    "sender@example.invalid",
    { origin: `http://127.0.0.1:${addr.port}`, allowLocalTest: true },
  );
}
const envelope = {
  from: "sender@example.invalid",
  to: ["buyer@example.invalid"],
  subject: "Order received",
  text: "Open the app. No photo or code.",
};
it("uses the real request contract against local HTTP only; acceptance is not delivery", async () => {
  const id = randomUUID(),
    key = "iprasm-outbox/" + randomUUID(),
    requests: {
      method: string;
      url: string;
      body: string;
      key: string | undefined;
    }[] = [];
  const adapter = await mock(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    requests.push({
      method: req.method!,
      url: req.url!,
      body,
      key: req.headers["idempotency-key"] as string | undefined,
    });
    expect(req.headers.authorization).toBe("Bearer synthetic-unit-key-only");
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        req.method === "POST" ? { id } : { id, last_event: "delivered" },
      ),
    );
  });
  expect(await adapter.send(envelope, key)).toEqual({ id });
  expect(await adapter.status(id)).toBe("delivered");
  expect(requests).toEqual([
    { method: "POST", url: "/emails", body: JSON.stringify(envelope), key },
    { method: "GET", url: "/emails/" + id, body: "", key: undefined },
  ]);
});
it("retries only transient HTTP errors and bounds Retry-After without exposing provider bodies", async () => {
  let code = 429;
  const adapter = await mock((_req, res) => {
    res.statusCode = code;
    res.setHeader("Retry-After", "999999");
    res.end("PRIVATE PROVIDER ERROR");
  });
  await expect(
    adapter.send(envelope, "iprasm-outbox/" + randomUUID()),
  ).rejects.toMatchObject({
    retryable: true,
    code: "provider-429",
    retryAfterMs: 3600000,
    message: "Email operation failed",
  });
  code = 401;
  await expect(
    adapter.send(envelope, "iprasm-outbox/" + randomUUID()),
  ).rejects.toMatchObject({ retryable: false, code: "provider-401" });
  code = 503;
  await expect(adapter.status(randomUUID())).rejects.toMatchObject({
    retryable: true,
    code: "provider-503",
  });
});
it("refuses redirect, oversized/bad acceptance, mismatched retrieval and unsafe envelopes", async () => {
  let response = 0,
    hits = 0;
  const id = randomUUID(),
    adapter = await mock((_req, res) => {
      hits++;
      if (response === 0) {
        res.statusCode = 302;
        res.setHeader("Location", "http://127.0.0.1:1/no-network");
        res.end();
      } else if (response === 1) res.end("x".repeat(65537));
      else if (response === 2) res.end(JSON.stringify({ id: "not-an-id" }));
      else res.end(JSON.stringify({ id, last_event: "delivered" }));
    });
  await expect(
    adapter.send(envelope, "iprasm-outbox/" + randomUUID()),
  ).rejects.toMatchObject({ retryable: true });
  response = 1;
  await expect(
    adapter.send(envelope, "iprasm-outbox/" + randomUUID()),
  ).rejects.toMatchObject({ retryable: false, code: "response-limit" });
  response = 2;
  await expect(
    adapter.send(envelope, "iprasm-outbox/" + randomUUID()),
  ).rejects.toMatchObject({ code: "bad-response" });
  response = 3;
  await expect(adapter.status(randomUUID())).rejects.toMatchObject({
    code: "bad-response",
  });
  const before = hits;
  for (const change of [
    { from: "spoof@example.invalid" },
    { to: ["one@example.invalid", "two@example.invalid"] },
    { subject: "Header\nInjection" },
    { text: "x".repeat(4001) },
  ])
    await expect(
      adapter.send({ ...envelope, ...change }, "iprasm-outbox/" + randomUUID()),
    ).rejects.toMatchObject({ code: "invalid-envelope" });
  expect(hits).toBe(before);
});
it("maps provider terminal and nonterminal states without promising recipient reads", async () => {
  let event = "sent";
  const id = randomUUID(),
    adapter = await mock((_req, res) =>
      res.end(JSON.stringify({ id, last_event: event })),
    );
  for (const value of ["sent", "queued", "delivery_delayed"]) {
    event = value;
    expect(await adapter.status(id)).toBe("pending");
  }
  for (const value of ["delivered", "opened", "clicked"]) {
    event = value;
    expect(await adapter.status(id)).toBe("delivered");
  }
  for (const value of [
    "bounced",
    "failed",
    "suppressed",
    "canceled",
    "complained",
  ]) {
    event = value;
    expect(await adapter.status(id)).toBe("failed");
  }
});
it("mock idempotency enforces exact payload; defaults and test guards prohibit accidental live sends", async () => {
  const m = new MockEmailAdapter(),
    key = "iprasm-outbox/" + randomUUID(),
    a = await m.send(envelope, key);
  expect(await m.send(envelope, key)).toEqual(a);
  await expect(
    m.send({ ...envelope, text: "different" }, key),
  ).rejects.toMatchObject({ code: "payload-changed" });
  expect(emailAdapter({}).mode).toBe("disabled");
  expect(
    emailAdapter({ TRANSACTIONAL_EMAIL_MODE: "mock", IP_RASM_TEST_SERVER: "1" })
      .mode,
  ).toBe("mock");
  for (const env of [
    { TRANSACTIONAL_EMAIL_MODE: "mock" },
    {
      TRANSACTIONAL_EMAIL_MODE: "mock",
      IP_RASM_TEST_SERVER: "1",
      NODE_ENV: "production",
    },
    { TRANSACTIONAL_EMAIL_MODE: "resend", IP_RASM_TEST_SERVER: "1" },
    { TRANSACTIONAL_EMAIL_MODE: "unknown" },
  ])
    expect(() => emailAdapter(env)).toThrow();
  for (const origin of [
    "https://api.resend.com",
    "http://localhost:1",
    "http://127.0.0.1:1/path",
    "http://127.0.0.1:1/?key=private",
  ])
    expect(
      () =>
        new ResendEmailAdapter("synthetic-unit-key-only", envelope.from, {
          origin,
          allowLocalTest: true,
        }),
    ).toThrow();
});
