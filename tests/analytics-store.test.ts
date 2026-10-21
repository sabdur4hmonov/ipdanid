import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { AnalyticsStore } from "../server/analytics-store";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
const now = Date.UTC(2026, 9, 21, 8, 0, 0, 123);
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  const a = new AnalyticsStore(s),
    user = s.createGuest().id,
    other = s.createGuest().id;
  return { s, a, user, other };
}
function event(consentRevision = 1) {
  return {
    requestKey: randomUUID(),
    consentRevision,
    kind: "preview-ready" as const,
    shape: "circle" as const,
  };
}
it("defaults off, requires exact consent, rejects old writes after revoke/erase and starts a fresh nonretroactive collection window", () => {
  const x = setup();
  expect(x.a.preferences(x.user)).toMatchObject({
    revision: 0,
    enabled: false,
    since: null,
  });
  expect(() => x.a.record(x.user, event(), now)).toThrow(/consent/);
  x.a.save(x.user, { revision: 0, enabled: true }, now);
  const e = event();
  expect(x.a.record(x.user, e, now)).toMatchObject({ duplicate: false });
  expect(x.a.record(x.user, e, now)).toMatchObject({ duplicate: true });
  expect(() => x.a.record(x.user, { ...e, shape: "heart" }, now)).toThrow(
    /retry differs/,
  );
  expect(() => x.a.save(x.user, { revision: 0, enabled: false }, now)).toThrow(
    /changed/,
  );
  x.a.erase(x.user, { revision: 1, erase: true }, now + 1);
  expect(x.a.export(x.user).events).toHaveLength(0);
  expect(() => x.a.record(x.user, e, now + 2)).toThrow(/consent/);
  const p = x.a.save(x.user, { revision: 2, enabled: true }, now + 3);
  expect(p.since).toBe(now + 3);
  expect(() => x.a.record(x.user, event(1), now + 4)).toThrow(/consent/);
  expect(x.a.report(now + 4).funnel.previews).toBe(0);
});
it("strict fixed schemas refuse text, photo, identities, arbitrary event types and invalid numeric dimensions", () => {
  const x = setup();
  x.a.save(x.user, { revision: 0, enabled: true }, now);
  for (const change of [
    { shape: "free-text" },
    { kind: "page-url" },
    { photo: "private photo" },
    { name: "PRIVATE NAME" },
    { text: "PRIVATE TEXT" },
    { consentRevision: NaN },
    { requestKey: "not-an-id" },
  ])
    expect(() => x.a.record(x.user, { ...event(), ...change }, now)).toThrow();
  for (const input of [
    { revision: 1, enabled: "yes" },
    { revision: 1, enabled: true, extra: "private" },
    null,
  ])
    expect(() => x.a.save(x.user, input, now)).toThrow();
  expect(() => x.a.erase(x.user, { revision: 1, erase: false }, now)).toThrow(
    /Explicit/,
  );
  expect(x.a.export(x.user).events).toHaveLength(0);
});
it("only an owned unlocked guide can produce a bounded self-reported manual confirmation; undo and out-of-order delivery stay honest", () => {
  const x = setup(),
    hash = "a".repeat(64);
  x.a.save(x.user, { revision: 0, enabled: true }, now);
  x.a.save(x.other, { revision: 0, enabled: true }, now);
  const base = {
    requestKey: randomUUID(),
    consentRevision: 1,
    kind: "assembly-confirmed" as const,
    sequenceHash: hash,
    revision: 1,
    confirmed: 1,
    total: 3000,
  };
  expect(() => x.a.record(x.user, base, now)).toThrow(/owned unlocked/);
  const code = x.s.issueCode("dev-circle", 1, Date.now() + 60000, "owner");
  x.s.redeemCode(x.user, code.code);
  x.s.unlockBuild(x.user, hash, randomUUID(), randomUUID());
  expect(() => x.a.record(x.other, base, now)).toThrow(/owned unlocked/);
  x.a.record(x.user, base, now + 1);
  for (const change of [
    { confirmed: 3001 },
    { confirmed: -1 },
    { total: 20001 },
    { revision: 0 },
    { confirmed: 1.1 },
    { source: "autoplay" },
  ])
    expect(() =>
      x.a.record(
        x.user,
        { ...base, ...change, requestKey: randomUUID() },
        now + 1,
      ),
    ).toThrow();
  x.a.record(
    x.user,
    { ...base, requestKey: randomUUID(), revision: 3, confirmed: 3000 },
    now + 3,
  );
  expect(x.a.report(now + 3).assembly.guidesCompleted).toBe(1);
  x.a.record(
    x.user,
    { ...base, requestKey: randomUUID(), revision: 2, confirmed: 1500 },
    now + 4,
  );
  expect(x.a.report(now + 4).assembly.guidesCompleted).toBe(1);
  x.a.record(
    x.user,
    { ...base, requestKey: randomUUID(), revision: 4, confirmed: 2999 },
    now + 5,
  );
  expect(x.a.report(now + 5).assembly.guidesCompleted).toBe(0);
  expect(() =>
    x.a.record(
      x.user,
      { ...base, requestKey: randomUUID(), revision: 4, confirmed: 3000 },
      now + 6,
    ),
  ).toThrow(/conflicts/);
  expect(() =>
    x.a.record(
      x.user,
      { ...base, requestKey: randomUUID(), total: 2999 },
      now + 6,
    ),
  ).toThrow(/conflicts/);
});
it("collects independent opted-in counts and actual post-consent support/repeat settlements without returning private contents or accounts", () => {
  const x = setup();
  x.a.save(x.user, { revision: 0, enabled: true }, now);
  x.a.record(x.user, { ...event(), kind: "photo-selected" }, now);
  x.a.record(x.user, event(), now);
  const order = () =>
    x.s.createOrder(
      x.user,
      [{ productId: "dev-circle", quantity: 1 }],
      { name: "PRIVATE NAME", city: "PRIVATE CITY", street: "PRIVATE ADDRESS" },
      randomUUID(),
    );
  const o1 = order(),
    o2 = order();
  x.s.recordTestPayment(o1.id);
  x.s.recordTestPayment(o2.id);
  x.s.db
    .prepare("UPDATE payments SET received_at=?")
    .run(new Date(now).toISOString());
  const ticket = x.s.ticket(x.user, "PRIVATE SUBJECT", "PRIVATE BODY");
  x.s.reply("staff", String(ticket.id), "PRIVATE REPLY", "answered");
  x.s.reply("staff", String(ticket.id), "SECOND PRIVATE REPLY", "closed");
  x.s.db
    .prepare("UPDATE tickets SET created_at=? WHERE id=?")
    .run(new Date(now).toISOString(), String(ticket.id));
  x.s.db
    .prepare("UPDATE ticket_replies SET created_at=? WHERE ticket_id=?")
    .run(new Date(now + 3600000).toISOString(), String(ticket.id));
  const report = x.a.report(now + 3600000);
  expect(report).toMatchObject({
    consentedAccounts: 1,
    funnel: { photos: 1, previews: 1 },
    commerce: { paidOrders: 2, repeatBuyers: 1, refundedOrders: 0 },
    support: { tickets: 1, answered: 1 },
  });
  expect(report.support.averageFirstReplyHours).toBeCloseTo(1, 5);
  for (const secret of ["PRIVATE", x.user, x.other, o1.id, o2.id])
    expect(JSON.stringify(report)).not.toContain(secret);
  x.s.requestReturn(x.user, o1.id);
  x.s.refund("staff", o1.id);
  expect(x.a.report(now + 3600000).commerce).toEqual({
    paidOrders: 1,
    repeatBuyers: 0,
    refundedOrders: 1,
  });
  x.a.save(x.user, { revision: 1, enabled: false }, now + 3600001);
  expect(x.a.report(now + 3600001)).toMatchObject({
    consentedAccounts: 0,
    funnel: { photos: 0, previews: 0 },
    commerce: { paidOrders: 0, repeatBuyers: 0, refundedOrders: 0 },
    support: { tickets: 0, answered: 0, averageFirstReplyHours: null },
  });
  x.a.save(x.user, { revision: 2, enabled: true }, now + 3600002);
  expect(x.a.report(now + 3600003).commerce.paidOrders).toBe(0);
  expect(x.a.report(now + 3600003).support.tickets).toBe(0);
});
it("private export and terminal account erasure cannot leak or resurrect another account; TTL and collection limits fail without product side effects", () => {
  const x = setup();
  x.a.save(x.user, { revision: 0, enabled: true }, now);
  for (let i = 0; i < 100; i++) x.a.record(x.user, event(), now + i);
  expect(() => x.a.record(x.user, event(), now + 101)).toThrow(/limit/);
  expect(x.a.export(x.user).events).toHaveLength(100);
  expect(x.a.export(x.other).events).toHaveLength(0);
  x.a.prune(now + 91 * 86400000);
  expect(x.a.export(x.user).events).toHaveLength(0);
  x.a.eraseAccount(x.user);
  expect(() => x.a.preferences(x.user)).toThrow(/unavailable/);
  expect(() => x.a.record(x.user, event(), now + 1)).toThrow(/unavailable/);
  expect(x.a.preferences(x.other).enabled).toBe(false);
  expect(x.s.orders(x.user)).toHaveLength(0);
  expect(x.s.balance(x.user)).toBe(0);
});
