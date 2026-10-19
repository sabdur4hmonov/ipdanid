import { it, expect, afterEach } from "vitest";
import { CustomerStore } from "../server/customer-store";
import { BusinessStore } from "../server/business-store";
import { OfferStore } from "../server/offer-store";
import type {
  OfferRule,
  OfferQuote,
  OrderActualCosts,
} from "../src/offer-types";
import { randomUUID } from "node:crypto";
import { adminRoutePermission } from "../server/admin-access";
const stores: CustomerStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
const address = {
    name: "Synthetic buyer",
    phone: "901234567",
    city: "",
    street: "",
    deliveryMethod: "pickup",
  },
  items = [{ productId: "offer-test", quantity: 1 }],
  DAY = 86400000;
function setup() {
  const s = new CustomerStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  s.updateProduct("owner", {
    id: "offer-test",
    name: "Synthetic offer kit",
    family: "string",
    price_minor: 10000,
    stock: 100,
    credits: 3,
    description: "Original test fixture",
    expectedRevision: 0,
    active: 1,
    profile_id: "test",
  });
  const b = new BusinessStore(s);
  b.saveSettings("owner", {
    ...b.settings(),
    pickupAddress: "Synthetic pickup",
    deliveryEnabled: true,
    deliveryFeeMinor: 2000,
  });
  let now = Date.now();
  const o = new OfferStore(s, () => now),
    buyer = s.createGuest(),
    referrer = s.createGuest(),
    other = s.createGuest();
  s.db
    .prepare("UPDATE users SET role='maker' WHERE id IN (?,?,?)")
    .run(buyer.id, referrer.id, other.id);
  const rule: OfferRule = {
    discountType: "percent",
    value: 1000,
    maxDiscountMinor: 100000,
    minSubtotalMinor: 0,
    startsAt: now - 1000,
    expiresAt: now + DAY,
    maxUses: 10,
    perAccountLimit: 1,
    enabled: true,
    revision: 0,
  };
  o.saveCode("owner", { code: "SAVE10", rule });
  return {
    s,
    o,
    b,
    buyer,
    referrer,
    other,
    rule,
    now: () => now,
    advance: (ms: number) => (now += ms),
  };
}
function order(
  s: CustomerStore,
  user: string,
  q: OfferQuote,
  key = randomUUID(),
) {
  return s.submitOrder(user, items, address, key, {
    totalMinor: q.totalMinor,
    settingsRevision: q.settingsRevision,
    offerQuoteId: q.id,
  });
}
const costs: OrderActualCosts = {
  materialsMinor: 2000,
  packingMinor: 300,
  fulfillmentMinor: 400,
  providerFeeMinor: 100,
  marketingMinor: 200,
  referralRewardMinor: 0,
};
it("rejects array-to-string enum coercion before financial rules or delivery quotes are accepted", () => {
  const { o, buyer, rule } = setup();
  expect(() =>
    o.saveCode("owner", {
      code: "ARRAY",
      rule: { ...rule, discountType: ["percent"], value: 100_000_000 },
    }),
  ).toThrow("rule");
  expect(() => o.quote(buyer.id, items, ["pickup"], "SAVE10")).toThrow(
    "delivery",
  );
});
it("validates revisioned financial rules, account permissions, bounds and configured referral consent", () => {
  const { s, o, buyer, rule } = setup();
  expect(o.policy().enabled).toBe(false);
  expect(() => o.referral(buyer.id, true)).toThrow("unavailable");
  expect(() => o.quote(s.createGuest().id, items, "pickup", "SAVE10")).toThrow(
    "account",
  );
  for (const patch of [
    { value: 10000 },
    { value: -1 },
    { maxUses: 0 },
    { perAccountLimit: 11 },
    { expiresAt: rule.startsAt },
    { enabled: "true" },
    { revision: 0.5 },
    { extra: true },
  ])
    expect(() =>
      o.saveCode("owner", { code: "BAD1", rule: { ...rule, ...patch } }),
    ).toThrow();
  expect(() => o.saveCode("owner", { code: "SAVE10", rule })).toThrow(
    "changed",
  );
  const updated = o.saveCode("owner", {
    code: "save10",
    rule: { ...rule, revision: 1, enabled: false },
  });
  expect(updated.rule.revision).toBe(2);
  expect(() => o.quote(buyer.id, items, "pickup", "SAVE10")).toThrow(
    "unavailable",
  );
  expect(adminRoutePermission("POST", "/api/admin/offers/codes")).toBe(
    "finance",
  );
  expect(adminRoutePermission("GET", "/api/admin/offers/report")).toBe(
    "finance",
  );
  expect(
    adminRoutePermission("POST", `/api/admin/orders/${randomUUID()}/costs`),
  ).toBe("finance");
  expect(adminRoutePermission("GET", "/api/admin/offers/codes")).toBeNull();
});
it("prices actual cart units on the server, never discounts shipping and refuses forged totals or references", () => {
  const { s, o, buyer, other } = setup(),
    q = o.quote(buyer.id, items, "courier", " save10 ");
  expect(q).toMatchObject({
    subtotalMinor: 10000,
    feeMinor: 2000,
    discountMinor: 1000,
    totalMinor: 11000,
    currency: "UZS",
  });
  const quote = {
    totalMinor: 1,
    settingsRevision: q.settingsRevision,
    offerQuoteId: q.id,
  };
  expect(() =>
    s.submitOrder(
      buyer.id,
      items,
      {
        ...address,
        deliveryMethod: "courier",
        city: "Test city",
        street: "Test street",
      },
      randomUUID(),
      quote,
    ),
  ).toThrow("changed");
  expect(() => order(s, other.id, q)).toThrow("expired or used");
  expect(() =>
    o.quote(buyer.id, [...items, ...items], "pickup", "SAVE10"),
  ).toThrow("cart");
  expect(() =>
    s.submitOrder(buyer.id, items, address, randomUUID(), {
      totalMinor: 9000,
      settingsRevision: q.settingsRevision,
      offerQuoteId: "",
    }),
  ).toThrow("reference");
  expect(() =>
    s.submitOrder(buyer.id, items, address, randomUUID(), {
      totalMinor: 9000,
      settingsRevision: q.settingsRevision,
      offerQuoteId: q.id,
      extra: "not accepted",
    } as any),
  ).toThrow("quote");
  expect(s.db.prepare("SELECT COUNT(*) n FROM orders").get()!.n).toBe(0);
  expect(
    s.db.prepare("SELECT stock FROM products WHERE id='offer-test'").get()!
      .stock,
  ).toBe(100);
});
it("bounds fixed discounts, minimum spend, start/end time and temporary quote storage without inventing free orders", () => {
  const { s, o, buyer, rule, now, advance } = setup();
  o.saveCode("owner", {
    code: "FIXED",
    rule: { ...rule, discountType: "fixed", value: 500, maxDiscountMinor: 300 },
  });
  expect(o.quote(buyer.id, items, "pickup", "FIXED")).toMatchObject({
    discountMinor: 300,
    totalMinor: 9700,
  });
  o.saveCode("owner", {
    code: "MAXIMUM",
    rule: {
      ...rule,
      discountType: "fixed",
      value: 20000,
      maxDiscountMinor: 20000,
    },
  });
  expect(o.quote(buyer.id, items, "pickup", "MAXIMUM")).toMatchObject({
    discountMinor: 9999,
    totalMinor: 1,
  });
  for (const [code, patch] of [
    ["MINIMUM", { minSubtotalMinor: 10001 }],
    ["FUTURE", { startsAt: now() + 1000 }],
    ["EXPIRED", { expiresAt: now() }],
  ] as const) {
    o.saveCode("owner", { code, rule: { ...rule, ...patch } });
    expect(() => o.quote(buyer.id, items, "pickup", code)).toThrow(
      "unavailable",
    );
  }
  for (let i = 0; i < 18; i++) o.quote(buyer.id, items, "pickup", "SAVE10");
  expect(() => o.quote(buyer.id, items, "pickup", "SAVE10")).toThrow(
    "Too many",
  );
  advance(5 * 60000);
  expect(o.prune().unused).toBe(20);
  const q = o.quote(buyer.id, items, "pickup", "SAVE10"),
    key = randomUUID(),
    created = order(s, buyer.id, q, key);
  advance(31 * DAY);
  expect(o.prune().used).toBe(1);
  expect(order(s, buyer.id, q, key).id).toBe(created.id);
});
it("atomically reserves one discount and stock; exact lost-response retries survive policy, price and quote expiry changes", () => {
  const { s, o, b, buyer, rule, advance } = setup(),
    q = o.quote(buyer.id, items, "pickup", "SAVE10"),
    key = randomUUID(),
    created = order(s, buyer.id, q, key);
  expect(created.total_minor).toBe(9000);
  expect(
    s.db.prepare("SELECT COUNT(*) n FROM offer_redemptions").get()!.n,
  ).toBe(1);
  o.saveCode("owner", {
    code: "SAVE10",
    rule: { ...rule, revision: 1, enabled: false },
  });
  s.db
    .prepare(
      "UPDATE products SET price_minor=20000,stock=0 WHERE id='offer-test'",
    )
    .run();
  b.saveSettings("owner", { ...b.settings(), pickupAddress: "" });
  advance(10 * 60000);
  expect(order(s, buyer.id, q, key).id).toBe(created.id);
  expect(() =>
    s.submitOrder(buyer.id, items, address, key, {
      totalMinor: 9000,
      settingsRevision: q.settingsRevision,
    }),
  ).toThrow("retry");
  expect(() => order(s, buyer.id, { ...q, id: randomUUID() }, key)).toThrow(
    "retry",
  );
  expect(s.db.prepare("SELECT COUNT(*) n FROM orders").get()!.n).toBe(1);
  s.recordTestPayment(created.id);
  s.recordTestPayment(created.id);
  expect(
    s.db
      .prepare("SELECT COUNT(*) n FROM payments WHERE order_id=?")
      .get(created.id)!.n,
  ).toBe(1);
  expect(s.balance(buyer.id)).toBe(3);
});
it("rechecks changed price, delivery revision, rule and expiration without consuming a quote or creating an order", () => {
  const { s, o, b, buyer, rule, advance } = setup();
  let q = o.quote(buyer.id, items, "pickup", "SAVE10");
  s.db
    .prepare("UPDATE products SET price_minor=11000 WHERE id='offer-test'")
    .run();
  expect(() => order(s, buyer.id, q)).toThrow("changed");
  q = o.quote(buyer.id, items, "pickup", "SAVE10");
  b.saveSettings("owner", { ...b.settings(), sellerName: "New seller" });
  expect(() => order(s, buyer.id, q)).toThrow("changed");
  q = o.quote(buyer.id, items, "pickup", "SAVE10");
  o.saveCode("owner", {
    code: "SAVE10",
    rule: { ...rule, revision: 1, value: 1500 },
  });
  expect(() => order(s, buyer.id, q)).toThrow("changed");
  q = o.quote(buyer.id, items, "pickup", "SAVE10");
  advance(5 * 60000);
  expect(() => order(s, buyer.id, q)).toThrow("expired");
  expect(s.db.prepare("SELECT COUNT(*) n FROM orders").get()!.n).toBe(0);
  expect(
    s.db.prepare("SELECT COUNT(*) n FROM offer_redemptions").get()!.n,
  ).toBe(0);
});
it("holds global and per-account limits for accepted unpaid orders and releases only cancellation, never a refund", () => {
  const { s, o, buyer, other, rule } = setup();
  o.saveCode("owner", { code: "ONCE", rule: { ...rule, maxUses: 1 } });
  const a = o.quote(buyer.id, items, "pickup", "ONCE"),
    b = o.quote(other.id, items, "pickup", "ONCE"),
    first = order(s, buyer.id, a);
  expect(() => order(s, other.id, b)).toThrow("limit");
  s.cancelOrder(buyer.id, first.id);
  const second = order(s, other.id, b);
  s.recordTestPayment(second.id);
  s.requestReturn(other.id, second.id);
  s.refund("owner", second.id);
  expect(() => o.quote(buyer.id, items, "pickup", "ONCE")).toThrow("limit");
  expect(
    s.db.prepare("SELECT stock FROM products WHERE id='offer-test'").get()!
      .stock,
  ).toBe(100);
});
it("rolls order, stock, quote and redemption back together after an injected final reservation failure", () => {
  const { s, o, buyer } = setup(),
    q = o.quote(buyer.id, items, "pickup", "SAVE10"),
    key = randomUUID();
  s.db.exec(
    "CREATE TRIGGER fail_offer BEFORE INSERT ON offer_redemptions BEGIN SELECT RAISE(ABORT,'injected reservation failure'); END;",
  );
  expect(() => order(s, buyer.id, q, key)).toThrow("injected");
  expect(s.db.prepare("SELECT COUNT(*) n FROM orders").get()!.n).toBe(0);
  expect(
    s.db.prepare("SELECT stock FROM products WHERE id='offer-test'").get()!
      .stock,
  ).toBe(100);
  expect(
    s.db.prepare("SELECT order_id FROM offer_quotes WHERE id=?").get(q.id)!
      .order_id,
  ).toBeNull();
  s.db.exec("DROP TRIGGER fail_offer");
  expect(order(s, buyer.id, q, key).total_minor).toBe(9000);
});
it("attributes referrals only to an actual first settled purchase; self, duplicate, refunded and cross-code reuse are refused", () => {
  const { s, o, buyer, referrer, other } = setup();
  o.savePolicy("owner", { ...o.policy(), enabled: true });
  const code = o.referral(referrer.id, true).code!;
  expect(o.referral(referrer.id, true).code).toBe(code);
  expect(() => o.quote(referrer.id, items, "pickup", code)).toThrow(
    "unavailable",
  );
  const q = o.quote(buyer.id, items, "pickup", code),
    created = order(s, buyer.id, q);
  expect(created.total_minor).toBe(9500);
  expect(o.referral(referrer.id)).toMatchObject({
    pending: 1,
    qualified: 0,
    automaticRewards: false,
  });
  expect(() => o.quote(buyer.id, items, "pickup", code)).toThrow();
  s.recordTestPayment(created.id);
  s.recordTestPayment(created.id);
  expect(o.referral(referrer.id).qualified).toBe(1);
  s.requestReturn(buyer.id, created.id);
  s.refund("owner", created.id);
  expect(o.referral(referrer.id)).toMatchObject({ qualified: 0, reversed: 1 });
  const another = o.referral(other.id, true).code!;
  expect(() => o.quote(buyer.id, items, "pickup", another)).toThrow(
    "first purchase",
  );
  const output = o.referral(referrer.id);
  expect(Object.keys(output).sort()).toEqual(
    [
      "automaticRewards",
      "cancelled",
      "code",
      "discountBps",
      "enabled",
      "pending",
      "qualified",
      "reversed",
    ].sort(),
  );
});
it("reports actual-cost contribution without guessing missing costs, double subtracting discounts or multiplying payment callbacks", () => {
  const { s, o, buyer } = setup(),
    q = o.quote(buyer.id, items, "pickup", "SAVE10"),
    created = order(s, buyer.id, q);
  expect(o.report()[0]).toMatchObject({
    recognizedRevenueMinor: 0,
    discountMinor: 1000,
    netContributionMinor: null,
  });
  s.recordTestPayment(created.id);
  s.recordTestPayment(created.id);
  o.saveCosts("owner", created.id, { revision: 0, costs });
  expect(o.report()[0]).toMatchObject({
    recognizedRevenueMinor: 9000,
    netContributionMinor: 6000,
    costRevision: 1,
  });
  expect(() =>
    o.saveCosts("owner", created.id, { revision: 0, costs }),
  ).toThrow("changed");
  for (const bad of [
    { ...costs, marketingMinor: -1 },
    { materialsMinor: 0 },
    { ...costs, providerFeeMinor: 0.5 },
    { ...costs, extra: 3 },
  ])
    expect(() =>
      o.saveCosts("owner", created.id, { revision: 1, costs: bad }),
    ).toThrow("costs");
  s.requestReturn(buyer.id, created.id);
  s.refund("owner", created.id);
  expect(o.report()[0]).toMatchObject({
    recognizedRevenueMinor: 0,
    netContributionMinor: -3000,
  });
  expect(
    s.db
      .prepare(
        "SELECT COUNT(*) n FROM order_actual_cost_history WHERE order_id=?",
      )
      .get(created.id)!.n,
  ).toBe(1);
});
