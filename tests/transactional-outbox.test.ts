import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { KitStore } from "../server/kit-store";
import { TransactionalOutbox } from "../server/transactional-outbox";
import {
  EmailFailure,
  MockEmailAdapter,
  type EmailAdapter,
  type EmailEnvelope,
} from "../server/email-adapter";
import { transactionalCopy } from "../src/transactional-copy";
import { TRANSACTIONAL_KINDS } from "../src/transactional-types";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup(adapter: EmailAdapter = new MockEmailAdapter(), optIn = true) {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  const out = new TransactionalOutbox(s, "p".repeat(32), adapter),
    user = s.createGuest().id;
  s.register(user, "buyer@example.invalid", "Synthetic-password-123!");
  if (optIn)
    out.savePreferences(user, { revision: 0, locale: "en", emailOptIn: true });
  const create = () =>
    s.createOrder(
      user,
      [{ productId: "dev-circle", quantity: 1 }],
      {
        name: "PRIVATE CUSTOMER",
        city: "PRIVATE CITY",
        street: "PRIVATE STREET",
      },
      randomUUID(),
    );
  const job = () =>
    s.db
      .prepare(
        "SELECT * FROM transactional_outbox ORDER BY created_at,id LIMIT 1",
      )
      .get()!;
  return { s, out, user, create, job };
}
it("atomically stores one private event per real order transition; exact retries do not duplicate it", () => {
  const x = setup(),
    order = x.create();
  expect(x.out.inbox(x.user)).toHaveLength(1);
  x.s.recordTestPayment(order.id);
  x.s.recordTestPayment(order.id);
  x.s.fulfill("staff", order.id, "PRIVATE TRACKING");
  x.s.requestReturn(x.user, order.id);
  x.s.requestReturn(x.user, order.id);
  x.s.refund("staff", order.id);
  x.s.refund("staff", order.id);
  expect(
    x.out
      .inbox(x.user)
      .map((m) => m.kind)
      .sort(),
  ).toEqual(
    [
      "order-created",
      "order-paid",
      "order-sent",
      "order-return-requested",
      "order-refunded",
    ].sort(),
  );
  const safe = JSON.stringify([x.out.admin(), x.out.inbox(x.user)]);
  for (const secret of [
    "buyer@example.invalid",
    "PRIVATE CUSTOMER",
    "PRIVATE CITY",
    "PRIVATE STREET",
    "PRIVATE TRACKING",
    "cipher",
    "provider_id",
  ])
    expect(safe).not.toContain(secret);
  expect(String(x.job().cipher)).not.toContain("buyer");
  expect(
    JSON.stringify(
      x.s.db.prepare("SELECT payload FROM transactional_outbox").all(),
    ),
  ).not.toContain("PRIVATE");
});
it("outbox insert failure rolls back order stock and payment/credit changes", () => {
  const x = setup(),
    stock = x.s.products().find((p) => p.id === "dev-circle")!.stock;
  x.s.db.exec(
    "CREATE TRIGGER reject_mail BEFORE INSERT ON transactional_outbox BEGIN SELECT RAISE(ABORT,'injected outbox failure'); END;",
  );
  expect(() => x.create()).toThrow(/injected/);
  expect(x.s.orders(x.user)).toHaveLength(0);
  expect(x.s.products().find((p) => p.id === "dev-circle")!.stock).toBe(stock);
  x.s.db.exec("DROP TRIGGER reject_mail");
  const order = x.create();
  x.s.db.exec(
    "CREATE TRIGGER reject_mail BEFORE INSERT ON transactional_outbox BEGIN SELECT RAISE(ABORT,'injected outbox failure'); END;",
  );
  expect(() => x.s.recordTestPayment(order.id)).toThrow(/injected/);
  expect(x.s.balance(x.user)).toBe(0);
  expect(x.s.order(x.user, order.id).status).toBe("pending");
  expect(x.s.db.prepare("SELECT COUNT(*) n FROM payments").get()!.n).toBe(0);
});
it("accepted and delivered are distinct; status polling never sends a second message", async () => {
  const adapter = new MockEmailAdapter(),
    x = setup(adapter);
  x.create();
  const now = Number(x.job().created_at);
  expect(await x.out.drain(now)).toEqual({ processed: 1 });
  expect(x.job()).toMatchObject({
    state: "accepted",
    attempts: 1,
    polls: 0,
    cipher: "",
  });
  expect(await x.out.drain(now + 60000)).toEqual({ processed: 1 });
  expect(x.job()).toMatchObject({ state: "delivered", attempts: 1, polls: 1 });
  expect(() => x.out.retry(x.job().id)).toThrow(/checked again/);
});
it("retries a lost acceptance using exactly the original encrypted envelope and stable key", async () => {
  const sent: { envelope: EmailEnvelope; key: string }[] = [];
  let calls = 0;
  const adapter: EmailAdapter = {
    mode: "mock",
    sender: "sender@example.invalid",
    send: async (envelope, key) => {
      sent.push({ envelope, key });
      if (++calls === 1) throw new EmailFailure(true, "temporary", 120000);
      return { id: randomUUID() };
    },
    status: async () => "pending",
  };
  const x = setup(adapter);
  x.create();
  const now = Number(x.job().created_at);
  await x.out.drain(now);
  expect(x.job()).toMatchObject({
    state: "queued",
    attempts: 1,
    due_at: now + 120000,
  });
  expect((await x.out.drain(now + 119999)).processed).toBe(0);
  x.out.savePreferences(x.user, {
    revision: 1,
    locale: "ru",
    emailOptIn: true,
  });
  await x.out.drain(now + 120000);
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual(sent[0]);
  expect(sent[0].envelope.subject).toContain("Order received");
  expect(x.job().state).toBe("accepted");
});
it("bounds attempts and the provider idempotency window without inventing successful delivery", async () => {
  let sends = 0;
  const adapter: EmailAdapter = {
    mode: "mock",
    sender: "sender@example.invalid",
    send: async () => {
      sends++;
      throw new EmailFailure(true);
    },
    status: async () => "pending",
  };
  const x = setup(adapter);
  x.create();
  let at = Number(x.job().created_at);
  for (let i = 0; i < 5; i++) {
    await x.out.drain(at);
    at = Number(x.job().due_at);
  }
  await x.out.drain(at);
  expect(sends).toBe(5);
  expect(x.job()).toMatchObject({ state: "unknown", attempts: 5, cipher: "" });
  expect(() => x.out.retry(x.job().id)).toThrow(/window/);
  const y = setup(adapter);
  y.create();
  await y.out.drain(Number(y.job().created_at) + 23 * 3600000);
  expect(y.job()).toMatchObject({ state: "unknown", attempts: 0, cipher: "" });
  expect(sends).toBe(5);
});
it("opt-out cancels queued sends; stale in-flight completion cannot restore a job or opt back in", async () => {
  let resolve!: (value: { id: string }) => void;
  const adapter: EmailAdapter = {
    mode: "mock",
    sender: "sender@example.invalid",
    send: () =>
      new Promise((r) => {
        resolve = r;
      }),
    status: async () => "pending",
  };
  const x = setup(adapter);
  x.create();
  const pending = x.out.drain();
  expect(x.job().state).toBe("sending");
  expect((await x.out.drain()).processed).toBe(0);
  x.out.savePreferences(x.user, {
    revision: 1,
    locale: "en",
    emailOptIn: false,
  });
  resolve({ id: randomUUID() });
  await pending;
  expect(x.job()).toMatchObject({
    state: "unknown",
    cipher: "",
    provider_id: null,
    error_code: "opted-out",
  });
  expect(() =>
    x.out.savePreferences(x.user, {
      revision: 1,
      locale: "en",
      emailOptIn: true,
    }),
  ).toThrow(/changed/);
  const y = setup();
  y.create();
  y.out.savePreferences(y.user, {
    revision: 1,
    locale: "en",
    emailOptIn: false,
  });
  expect(y.job().state).toBe("cancelled");
  expect((await y.out.drain()).processed).toBe(0);
});
it("expired send lease reuses its key; expired polling lease never becomes a send", async () => {
  const x = setup();
  x.create();
  const now = Number(x.job().created_at);
  x.s.db
    .prepare(
      "UPDATE transactional_outbox SET state='sending',attempts=1,first_attempt=?,lease_until=?,lease_tag='old'",
    )
    .run(now, now + 60000);
  expect((await x.out.drain(now + 59999)).processed).toBe(0);
  await x.out.drain(now + 60000);
  expect(x.job()).toMatchObject({ state: "accepted", attempts: 2 });
  x.s.db
    .prepare(
      "UPDATE transactional_outbox SET state='checking',polls=1,lease_until=?,lease_tag='old'",
    )
    .run(now + 120000);
  await x.out.drain(now + 120000);
  expect(x.job()).toMatchObject({ state: "delivered", attempts: 2, polls: 2 });
});
it("in-app works without opt-in or an email service; read/erase/retention respect ownership", async () => {
  const x = setup(undefined, false),
    order = x.create(),
    id = String(x.job().id),
    other = x.s.createGuest().id;
  expect(x.job()).toMatchObject({ state: "in_app", cipher: "" });
  expect((await x.out.drain()).processed).toBe(0);
  expect(x.out.inbox(other)).toHaveLength(0);
  expect(() => x.out.read(other, id)).toThrow(/not found/);
  x.out.read(x.user, id);
  expect(x.out.inbox(x.user)[0].read).toBe(true);
  x.out.eraseAccount(x.user);
  expect(() => x.out.inbox(x.user)).toThrow(/unavailable/);
  x.s.recordTestPayment(order.id);
  expect(x.out.admin().messages).toHaveLength(0);
  const y = setup();
  y.create();
  y.out.prune(Number(y.job().created_at) + 91 * 86400000);
  expect(y.out.admin().messages).toHaveLength(0);
});
it("support reply templates exclude ticket/reply content; pending cancellation is notified only once", () => {
  const x = setup(),
    ticket = x.s.ticket(x.user, "PRIVATE SUBJECT", "PRIVATE TICKET BODY", null);
  x.s.reply("staff", String(ticket.id), "PRIVATE REPLY BODY", "answered");
  const order = x.create();
  x.s.cancelOrder(x.user, order.id);
  x.s.cancelOrder(x.user, order.id);
  expect(
    x.out
      .inbox(x.user)
      .map((m) => m.kind)
      .sort(),
  ).toEqual(["support-replied", "order-created", "order-cancelled"].sort());
  expect(JSON.stringify(x.out.admin())).not.toContain("PRIVATE");
});
it("all fixed event templates exist in four locales and old copy versions cannot silently change", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    for (const kind of TRANSACTIONAL_KINDS) {
      const c = transactionalCopy("transactional-copy/1", locale, kind, {
        reference: randomUUID(),
        amountMinor: 12345,
        currency: "UZS",
      });
      expect(c.title.length).toBeGreaterThan(4);
      expect(c.body).toContain("UZS");
    }
  expect(
    transactionalCopy("transactional-copy/1", "uz-Cyrl", "order-created", {
      reference: randomUUID(),
    }).title,
  ).toMatch(/[А-Яа-я]/);
  expect(() =>
    transactionalCopy("future", "en", "order-created", {
      reference: randomUUID(),
    }),
  ).toThrow(/Unsupported/);
});
it("limits external work per account while retaining all in-app notices and rejects unsafe preference changes", () => {
  const x = setup();
  x.s.db.prepare("UPDATE products SET stock=100 WHERE id='dev-circle'").run();
  for (let i = 0; i < 21; i++) x.create();
  expect(
    x.s.db
      .prepare(
        "SELECT COUNT(*) n FROM transactional_outbox WHERE state='queued'",
      )
      .get()!.n,
  ).toBe(20);
  expect(x.out.inbox(x.user)).toHaveLength(21);
  expect(x.out.inbox(x.user).filter((m) => m.state === "in_app")).toHaveLength(
    1,
  );
  const guest = x.s.createGuest().id;
  expect(() =>
    x.out.savePreferences(guest, {
      revision: 0,
      locale: "en",
      emailOptIn: true,
    }),
  ).toThrow(/Email account/);
  for (const change of [
    { locale: "ar" },
    { revision: 0 },
    { emailOptIn: "yes" },
    { recipient: "other@example.invalid" },
  ])
    expect(() =>
      x.out.savePreferences(x.user, {
        revision: 1,
        locale: "en",
        emailOptIn: true,
        ...change,
      }),
    ).toThrow();
});
it("pending delivery polls are bounded and unknown provider status never starts a new POST", async () => {
  let sends = 0;
  const adapter: EmailAdapter = {
    mode: "mock",
    sender: "sender@example.invalid",
    send: async () => {
      sends++;
      return { id: randomUUID() };
    },
    status: async () => "pending",
  };
  const x = setup(adapter);
  x.create();
  let at = Number(x.job().created_at);
  await x.out.drain(at);
  for (let i = 0; i < 21; i++) {
    at = Number(x.job().due_at);
    await x.out.drain(at);
  }
  expect(x.job()).toMatchObject({
    state: "unknown",
    polls: 20,
    attempts: 1,
    cipher: "",
  });
  expect(sends).toBe(1);
  expect(() => x.out.retry(x.job().id, at)).toThrow(/checked again/);
});
it("a new database connection after shutdown recovers an interrupted acceptance using the same provider key and payload", async () => {
  mkdirSync("test-results", { recursive: true });
  const path = join(
      mkdtempSync(resolve("test-results", "phase15-outbox-restart-")),
      "database.sqlite",
    ),
    provider = new MockEmailAdapter();
  let release!: () => void;
  const seen: { key: string; envelope: EmailEnvelope }[] = [];
  const interrupted: EmailAdapter = {
    mode: "mock",
    sender: provider.sender,
    send: async (envelope, key) => {
      seen.push({ envelope, key });
      const result = await provider.send(envelope, key);
      await new Promise<void>((r) => {
        release = r;
      });
      return result;
    },
    status: (id) => provider.status(id),
  };
  const s = new KitStore(path, "p".repeat(32), "k".repeat(32));
  s.seed();
  const out = new TransactionalOutbox(s, "p".repeat(32), interrupted),
    user = s.createGuest().id;
  s.register(user, "restart@example.invalid", "Synthetic-password-123!");
  out.savePreferences(user, { revision: 0, locale: "en", emailOptIn: true });
  s.createOrder(
    user,
    [{ productId: "dev-circle", quantity: 1 }],
    { name: "Synthetic", city: "City", street: "Street" },
    randomUUID(),
  );
  const first = s.db
      .prepare("SELECT id,created_at FROM transactional_outbox")
      .get()!,
    at = Number(first.created_at),
    pending = out.drain(at);
  await Promise.resolve();
  out.stop();
  release();
  await pending;
  s.close();
  const reopened = new KitStore(path, "p".repeat(32), "k".repeat(32));
  stores.push(reopened);
  const adapter: EmailAdapter = {
      mode: "mock",
      sender: provider.sender,
      send: async (envelope, key) => {
        seen.push({ envelope, key });
        return provider.send(envelope, key);
      },
      status: (id) => provider.status(id),
    },
    resumed = new TransactionalOutbox(reopened, "p".repeat(32), adapter);
  expect((await resumed.drain(at + 59999)).processed).toBe(0);
  await resumed.drain(at + 60000);
  expect(seen).toHaveLength(2);
  expect(seen[1]).toEqual(seen[0]);
  await resumed.drain(at + 120000);
  expect(
    reopened.db
      .prepare(
        "SELECT state,attempts,polls FROM transactional_outbox WHERE id=?",
      )
      .get(first.id),
  ).toMatchObject({ state: "delivered", attempts: 2, polls: 1 });
});
