import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { PartnerStore } from "../server/partner-store";
import { adminRoutePermission } from "../server/admin-access";
import type { PartnerTerms } from "../src/partner-types";
const stores: KitStore[] = [];
afterEach(() => {
  vi.useRealTimers();
  stores.splice(0).forEach((s) => s.close());
});
function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T00:00:00Z"));
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  s.updateProduct("owner", {
    id: "partner-kit",
    name: "Original volume kit",
    family: "string",
    price_minor: 10000,
    stock: 100,
    credits: 3,
    description: "Original fixture",
    expectedRevision: 0,
    active: 1,
    profile_id: "standard-base-r1",
  });
  const a = s.createGuest(),
    b = s.createGuest(),
    other = s.createGuest();
  s.db
    .prepare("UPDATE users SET role='maker' WHERE id IN (?,?)")
    .run(a.id, b.id);
  const p = new PartnerStore(s),
    terms: PartnerTerms = {
      name: "Original partner",
      productId: "partner-kit",
      enabled: true,
      maxKits: 20,
      minBatch: 2,
      maxBatch: 10,
      codeDays: 30,
      creditDays: 60,
      tiers: [
        { minCount: 2, unitMinor: 9000 },
        { minCount: 5, unitMinor: 8000 },
      ],
      revision: 0,
    };
  const first = p.save("owner", { accountId: a.id, terms }),
    second = p.save("owner", {
      accountId: b.id,
      terms: { ...terms, name: "Other partner" },
    });
  return { s, p, a, b, other, terms, first, second };
}
function request(
  p: PartnerStore,
  user: string,
  count = 5,
  name = "Original campaign",
) {
  const quote = p.quote(user, { count, requestKey: randomUUID() }),
    campaign = p.request(user, {
      quoteId: quote.id,
      name,
      requestKey: randomUUID(),
    });
  return { quote, campaign };
}
it("validates owner-granted partner terms and never trusts partner-selected scope or financial fields", () => {
  const { s, p, a, other, terms, first } = setup();
  expect(() => p.portal(other.id)).toThrow("unavailable");
  expect(() => p.save("owner", { accountId: other.id, terms })).toThrow(
    "account required",
  );
  for (const patch of [
    { enabled: [true] },
    { maxBatch: 101 },
    { maxKits: 0 },
    { minBatch: 0 },
    { creditDays: -1 },
    { codeDays: 0 },
    { codeDays: 3651 },
    { revision: 0.1 },
    { tiers: [{ minCount: 2, unitMinor: 10001 }] },
    { tiers: [{ minCount: 3, unitMinor: 9000 }] },
    {
      tiers: [
        { minCount: 2, unitMinor: 8000 },
        { minCount: 5, unitMinor: 9000 },
      ],
    },
    { name: "bad\nname" },
    { productId: "missing" },
    { unexpected: true },
  ])
    expect(() =>
      p.save("owner", {
        accountId: a.id,
        terms: { ...terms, revision: 1, ...patch },
      }),
    ).toThrow();
  expect(() => p.save("owner", { accountId: a.id, terms })).toThrow("changed");
  const disabled = p.save("owner", {
    accountId: a.id,
    terms: { ...first.terms, enabled: false },
  });
  expect(disabled.terms.revision).toBe(2);
  expect(() => p.portal(a.id)).toThrow("unavailable");
  for (const path of [
    "/api/admin/partners",
    `/api/admin/partners/${first.id}/campaigns`,
  ])
    expect(adminRoutePermission("GET", path)).toBe("access");
  expect(
    adminRoutePermission(
      "POST",
      `/api/admin/partners/campaigns/${randomUUID()}/approve`,
    ),
  ).toBe("access");
  expect(adminRoutePermission("GET", "/api/partner")).toBeNull();
  expect(s.kitPolicy().quota).toBe(3);
});
it("quotes the actual configured volume tiers and binds retries without accepting forged price/profile fields", () => {
  const { p, a } = setup(),
    key = randomUUID();
  const q = p.quote(a.id, { count: 5, requestKey: key });
  expect(q).toMatchObject({
    count: 5,
    unitMinor: 8000,
    totalMinor: 40000,
    currency: "UZS",
    quota: 3,
    profile: "standard-base-r1",
    codeDays: 30,
    creditDays: 60,
  });
  expect(p.quote(a.id, { count: 5, requestKey: key })).toEqual(q);
  expect(p.quote(a.id, { count: 2, requestKey: randomUUID() }).totalMinor).toBe(
    18000,
  );
  expect(() => p.quote(a.id, { count: 6, requestKey: key })).toThrow(
    "retry changed",
  );
  for (const count of [1, 11, 2.5, "5", [5]])
    expect(() => p.quote(a.id, { count, requestKey: randomUUID() })).toThrow();
  expect(() =>
    p.quote(a.id, { count: 5, requestKey: randomUUID(), totalMinor: 1 } as any),
  ).toThrow("fields");
});
it("campaign requests are idempotent and foreign quotes/campaigns never cross partner scope", () => {
  const { p, a, b, first } = setup(),
    q = p.quote(a.id, { count: 5, requestKey: randomUUID() }),
    key = randomUUID();
  expect(() =>
    p.request(b.id, { quoteId: q.id, name: "Stolen", requestKey: key }),
  ).toThrow("unavailable");
  const c = p.request(a.id, {
    quoteId: q.id,
    name: "Original",
    requestKey: key,
  });
  expect(
    p.request(a.id, { quoteId: q.id, name: "Original", requestKey: key }),
  ).toEqual(c);
  expect(() =>
    p.request(a.id, { quoteId: q.id, name: "Changed", requestKey: key }),
  ).toThrow("retry changed");
  expect(() =>
    p.request(a.id, {
      quoteId: q.id,
      name: "Duplicate",
      requestKey: randomUUID(),
    }),
  ).toThrow("unavailable");
  expect(p.portal(b.id).campaigns).toEqual([]);
  expect(() => p.cancel(b.id, c.id, c.revision, b.id)).toThrow("not found");
  expect(() => p.issue(b.id, c.id, { revision: c.revision })).toThrow(
    "not found",
  );
  expect(p.campaigns(first.id)).toHaveLength(1);
  expect(JSON.stringify(p.portal(a.id))).not.toContain(b.id);
});
it("approval requires owner authorization and unchanged price/stock/terms, decrements inventory only once", () => {
  const { s, p, a, first } = setup(),
    { campaign: c } = request(p, a.id);
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(100);
  expect(() => p.issue(a.id, c.id, { revision: c.revision })).toThrow(
    "unavailable",
  );
  expect(() =>
    p.approve("owner", c.id, { revision: c.revision, authorizeIssue: false }),
  ).toThrow("authorization");
  const approved = p.approve("owner", c.id, {
    revision: c.revision,
    authorizeIssue: true,
  });
  expect(approved.status).toBe("approved");
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(95);
  expect(() =>
    p.approve("owner", c.id, { revision: c.revision, authorizeIssue: true }),
  ).toThrow("changed");
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(95);
  const other = request(p, a.id).campaign;
  p.save("owner", { accountId: a.id, terms: { ...first.terms, codeDays: 31 } });
  expect(() =>
    p.approve("owner", other.id, {
      revision: other.revision,
      authorizeIssue: true,
    }),
  ).toThrow("changed");
});
it("approved campaign issues the exact immutable kit contract once, never mutates defaults, and actual grants stay one-account", () => {
  const { s, p, a, first } = setup(),
    { campaign: c } = request(p, a.id);
  const approved = p.approve("owner", c.id, {
    revision: c.revision,
    authorizeIssue: true,
  });
  p.save("owner", {
    accountId: a.id,
    terms: { ...first.terms, codeDays: 99, creditDays: 99 },
  });
  const issued = p.issue(a.id, c.id, { revision: approved.revision });
  expect(issued.batch.codes).toHaveLength(5);
  expect(issued.campaign).toMatchObject({
    status: "issued",
    available: 5,
    claimed: 0,
  });
  expect(issued.batch.codes[0]).toMatchObject({
    quota: 3,
    creditDays: 60,
    expiresAt: Date.now() + 30 * 86400000,
  });
  expect(s.kitPolicy().creditDays).toBe(0);
  const code = issued.batch.codes[0].code,
    one = s.createGuest(),
    two = s.createGuest();
  expect(s.redeemKit(one.id, code).balance).toBe(3);
  expect(s.redeemKit(one.id, code).duplicate).toBe(true);
  expect(() => s.redeemKit(two.id, code)).toThrow("another account");
  expect(p.portal(a.id).campaigns[0]).toMatchObject({
    claimed: 1,
    available: 4,
  });
  expect(() => p.issue(a.id, c.id, { revision: approved.revision })).toThrow(
    "only once",
  );
  expect(s.db.prepare("SELECT COUNT(*) n FROM kit_codes").get()!.n).toBe(5);
  for (const table of [
    "partner_accounts",
    "partner_quotes",
    "partner_campaigns",
    "kit_codes",
    "kit_batches",
    "audit",
  ])
    expect(
      JSON.stringify(s.db.prepare(`SELECT * FROM ${table}`).all()),
    ).not.toContain(code);
  expect(JSON.stringify(p.portal(a.id))).not.toContain(one.id);
});
it("a failed campaign finalization rolls nested kit inserts and audit back; retry produces exactly one complete batch", () => {
  const { s, p, a } = setup(),
    { campaign: c } = request(p, a.id),
    approved = p.approve("owner", c.id, {
      revision: c.revision,
      authorizeIssue: true,
    });
  s.db.exec(
    "CREATE TRIGGER fail_partner_issue BEFORE UPDATE ON partner_campaigns WHEN NEW.status='issued' BEGIN SELECT RAISE(ABORT,'injected campaign failure'); END;",
  );
  expect(() => p.issue(a.id, c.id, { revision: approved.revision })).toThrow(
    "injected",
  );
  expect(s.db.prepare("SELECT COUNT(*) n FROM kit_codes").get()!.n).toBe(0);
  expect(s.db.prepare("SELECT COUNT(*) n FROM kit_batches").get()!.n).toBe(0);
  expect(p.portal(a.id).campaigns[0].status).toBe("approved");
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(95);
  s.db.exec("DROP TRIGGER fail_partner_issue");
  expect(
    p.issue(a.id, c.id, { revision: approved.revision }).batch.codes,
  ).toHaveLength(5);
  expect(s.db.isTransaction).toBe(false);
});
it("unused reservations return physical stock once while revoking distributed codes never invents returned boards or removes existing grants", () => {
  const { s, p, a } = setup(),
    one = request(p, a.id).campaign,
    approved = p.approve("owner", one.id, {
      revision: one.revision,
      authorizeIssue: true,
    });
  expect(p.cancel(a.id, one.id, approved.revision, a.id).status).toBe(
    "cancelled",
  );
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(100);
  expect(() => p.cancel(a.id, one.id, approved.revision, a.id)).toThrow(
    "changed",
  );
  const two = request(p, a.id).campaign,
    ready = p.approve("owner", two.id, {
      revision: two.revision,
      authorizeIssue: true,
    }),
    issued = p.issue(a.id, two.id, { revision: ready.revision }),
    recipient = s.createGuest();
  s.redeemKit(recipient.id, issued.batch.codes[0].code);
  const revoked = p.cancel("owner", two.id, issued.campaign.revision);
  expect(revoked).toMatchObject({
    status: "revoked",
    revoked: 5,
    claimed: 1,
    available: 0,
  });
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(95);
  expect(s.kitBalance(recipient.id)).toBe(3);
  expect(() =>
    s.redeemKit(s.createGuest().id, issued.batch.codes[1].code),
  ).toThrow("unavailable");
});
it("approved and distributed stock stays inside lifetime partner allocation; an expired unused reservation is returned once", () => {
  const { s, p, a, first } = setup();
  p.save("owner", {
    accountId: a.id,
    terms: { ...first.terms, maxKits: 5, maxBatch: 5 },
  });
  const one = request(p, a.id).campaign,
    approved = p.approve("owner", one.id, {
      revision: one.revision,
      authorizeIssue: true,
    }),
    two = request(p, a.id).campaign;
  expect(() =>
    p.approve("owner", two.id, {
      revision: two.revision,
      authorizeIssue: true,
    }),
  ).toThrow("allocation");
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(95);
  vi.setSystemTime(Date.now() + 7 * 86400000 + 1);
  expect(() => p.issue(a.id, one.id, { revision: approved.revision })).toThrow(
    "unavailable",
  );
  expect(p.prune().expired).toBe(2);
  expect(p.prune().expired).toBe(0);
  expect(s.products().find((p) => p.id === "partner-kit")!.stock).toBe(100);
  const three = request(p, a.id).campaign;
  expect(
    p.approve("owner", three.id, {
      revision: three.revision,
      authorizeIssue: true,
    }).status,
  ).toBe("approved");
});
it("source price/credit/profile edits and exact quote expiry cannot silently authorize a different campaign", () => {
  const { s, p, a } = setup(),
    q = p.quote(a.id, { count: 5, requestKey: randomUUID() });
  vi.setSystemTime(q.expiresAt);
  expect(() =>
    p.request(a.id, {
      quoteId: q.id,
      name: "Expired",
      requestKey: randomUUID(),
    }),
  ).toThrow("unavailable");
  const c = request(p, a.id).campaign,
    product = s.products().find((p) => p.id === "partner-kit")!;
  s.updateProduct("owner", {
    ...product,
    expectedRevision: product.revision,
    price_minor: 11000,
  });
  expect(() =>
    p.approve("owner", c.id, { revision: c.revision, authorizeIssue: true }),
  ).toThrow("changed");
  const fresh = request(p, a.id).campaign;
  s.db.prepare("UPDATE products SET stock=0 WHERE id='partner-kit'").run();
  expect(() =>
    p.approve("owner", fresh.id, {
      revision: fresh.revision,
      authorizeIssue: true,
    }),
  ).toThrow("stock changed");
  expect(s.db.prepare("SELECT COUNT(*) n FROM kit_codes").get()!.n).toBe(0);
});

it("an owner can disable a partner even after its catalog product has been retired", () => {
  const { s, p, a, first } = setup();
  s.db
    .prepare(
      "UPDATE products SET active=0,price_minor=0,credits=0 WHERE id='partner-kit'",
    )
    .run();
  expect(
    p.save("owner", {
      accountId: a.id,
      terms: { ...first.terms, enabled: false },
    }).terms.enabled,
  ).toBe(false);
  expect(() => p.portal(a.id)).toThrow("unavailable");
});

it("partner templates must have a reachable supported physical profile and volume totals must stay exact", () => {
  const { s, p, a, first } = setup();
  s.db
    .prepare("INSERT INTO profiles VALUES('unreachable-custom',1,'{}',0)")
    .run();
  s.db
    .prepare(
      "UPDATE products SET profile_id='unreachable-custom' WHERE id='partner-kit'",
    )
    .run();
  expect(() =>
    p.save("owner", { accountId: a.id, terms: first.terms }),
  ).toThrow("profile unavailable");
  expect(() =>
    p.save("owner", {
      accountId: a.id,
      terms: {
        ...first.terms,
        enabled: false,
        tiers: [{ minCount: 2, unitMinor: Number.MAX_SAFE_INTEGER }],
      },
    }),
  ).toThrow("price tiers");
});
