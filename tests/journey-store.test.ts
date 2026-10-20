import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { JourneyStore } from "../server/journey-store";
import { BusinessStore } from "../server/business-store";
import { CatalogStore } from "../server/catalog-store";
import { adminRoutePermission } from "../server/admin-access";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup(kind: "app" | "gift" = "app") {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  s.seed();
  stores.push(s);
  new CatalogStore(s);
  const b = new BusinessStore(s),
    j = new JourneyStore(s),
    user = s.createGuest().id,
    other = s.createGuest().id;
  s.db
    .prepare("UPDATE users SET role='maker' WHERE id IN (?,?)")
    .run(user, other);
  s.updateProduct("owner", {
    id: "digital-kit",
    name: "Original digital credits",
    family: "digital",
    price_minor: 10000,
    currency: "UZS",
    stock: 30,
    credits: 3,
    description: "Original digital entitlement",
    expectedRevision: 0,
    active: 1,
    profile_id: "standard-base-r1",
  });
  j.save("owner", {
    version: "journey-product/1",
    productId: "digital-kit",
    kind,
    enabled: true,
    revision: 0,
  });
  function body() {
    const p = s.products().find((p) => p.id === "digital-kit")!;
    return {
      productId: "digital-kit",
      kind,
      name: "Synthetic buyer",
      locale: "en",
      requestKey: randomUUID(),
      quote: {
        productRevision: Number(p.revision),
        settingsRevision: b.settings().revision,
        totalMinor: 10000,
        currency: "UZS" as const,
      },
    };
  }
  return { s, b, j, user, other, body };
}
const stock = (s: KitStore) =>
  s.products().find((p) => p.id === "digital-kit")!.stock;
it("app-only purchase uses server price with no physical delivery and one paid credit grant", () => {
  const f = setup(),
    body = f.body(),
    p = f.j.purchase(f.user, body);
  expect(p).toMatchObject({
    kind: "app",
    status: "pending",
    totalMinor: 10000,
    gift: null,
  });
  expect(f.s.balance(f.user)).toBe(0);
  expect(f.s.orders(f.user)[0].commerce).toMatchObject({
    method: "online",
    feeMinor: 0,
    pickupAddress: "",
  });
  f.s.recordTestPayment(p.orderId);
  f.s.recordTestPayment(p.orderId);
  expect(f.s.balance(f.user)).toBe(3);
  expect(stock(f.s)).toBe(29);
  expect(f.j.purchase(f.user, body).orderId).toBe(p.orderId);
});
it("gift activates only after settlement, reserves buyer credits and grants exactly one recipient", () => {
  const f = setup("gift"),
    p = f.j.purchase(f.user, f.body());
  expect(p.gift).toBeNull();
  f.s.recordTestPayment(p.orderId);
  const gift = f.j.get(f.user, p.orderId).gift!;
  expect(gift.status).toBe("active");
  expect(f.s.balance(f.user)).toBe(0);
  expect(() => f.j.get(f.other, p.orderId)).toThrow(/not found/);
  expect(f.j.list(f.other)).toHaveLength(0);
  expect(f.s.redeemGift(f.other, gift.claimToken!).alreadyRedeemed).toBe(false);
  expect(f.s.redeemGift(f.other, gift.claimToken!).alreadyRedeemed).toBe(true);
  expect(f.s.balance(f.other)).toBe(3);
  expect(() => f.s.redeemGift(f.user, gift.claimToken!)).toThrow(/unavailable/);
  expect(f.j.get(f.user, p.orderId).gift).not.toHaveProperty("claimToken");
  f.s.requestReturn(f.user, p.orderId);
  expect(() => f.s.refund("finance", p.orderId)).toThrow(/Redeemed gift/);
  expect(f.s.balance(f.other)).toBe(3);
});
it("unclaimed gift refund cancels and reverses the real escrow once with original stock", () => {
  const f = setup("gift"),
    p = f.j.purchase(f.user, f.body());
  f.s.recordTestPayment(p.orderId);
  f.s.requestReturn(f.user, p.orderId);
  f.s.refund("finance", p.orderId);
  f.s.refund("finance", p.orderId);
  expect(f.s.balance(f.user)).toBe(0);
  expect(stock(f.s)).toBe(30);
  expect(f.j.get(f.user, p.orderId).gift?.status).toBe("cancelled");
});
it("gift-finalization failure rolls back payment credit, nested reservation, gift and order state", () => {
  const f = setup("gift"),
    p = f.j.purchase(f.user, f.body());
  f.s.db.exec(
    "CREATE TRIGGER fail_gift_finalization BEFORE UPDATE ON digital_purchases BEGIN SELECT RAISE(ABORT,'Injected gift finalization');END;",
  );
  expect(() => f.s.recordTestPayment(p.orderId)).toThrow(/Injected/);
  expect(f.s.balance(f.user)).toBe(0);
  expect(f.s.db.prepare("SELECT COUNT(*) n FROM gifts").get()!.n).toBe(0);
  expect(f.s.db.prepare("SELECT COUNT(*) n FROM payments").get()!.n).toBe(0);
  expect(f.j.get(f.user, p.orderId).status).toBe("pending");
  f.s.db.exec("DROP TRIGGER fail_gift_finalization");
  f.s.recordTestPayment(p.orderId);
  expect(f.j.get(f.user, p.orderId).gift?.status).toBe("active");
});
it("original pending retry survives retired policies and product repricing, but a new purchase must review", () => {
  const f = setup(),
    body = f.body(),
    p = f.j.purchase(f.user, body),
    prod = f.s.products().find((p) => p.id === "digital-kit")!;
  f.s.updateProduct("owner", {
    ...prod,
    expectedRevision: prod.revision,
    price_minor: 12000,
    active: 0,
  });
  f.j.save("owner", { ...f.j.policy("digital-kit")!, enabled: false });
  expect(f.j.purchase(f.user, body).orderId).toBe(p.orderId);
  expect(() =>
    f.j.purchase(f.user, { ...body, name: "Changed buyer" }),
  ).toThrow(/retry/);
  expect(() =>
    f.j.purchase(f.user, { ...body, requestKey: randomUUID() }),
  ).toThrow(/unavailable|changed/);
  expect(stock(f.s)).toBe(29);
});
it("ordinary cart and guest cannot bypass the digital purchase contract", () => {
  const f = setup(),
    guest = f.s.createGuest().id;
  expect(() => f.j.purchase(guest, f.body())).toThrow(/durable account/);
  expect(() =>
    f.s.createOrder(
      f.user,
      [{ productId: "digital-kit", quantity: 1 }],
      { name: "Synthetic buyer", city: "City", street: "Street" },
      randomUUID(),
    ),
  ).toThrow(/digital purchase/);
  expect(f.s.orders(f.user)).toHaveLength(0);
  expect(stock(f.s)).toBe(30);
});
it("reserved purchase-gift idempotency namespace cannot be preclaimed through ordinary transfers", () => {
  const f = setup("gift");
  expect(() =>
    f.s.createGift(
      f.user,
      3,
      Date.now() + 86400000,
      "purchase-gift:" + randomUUID(),
    ),
  ).toThrow(/Invalid gift/);
});
it("policy and purchase fields reject coercion, private overrides and stale price revisions", () => {
  const f = setup(),
    policy = f.j.policy("digital-kit")!;
  expect(adminRoutePermission("POST", "/api/admin/journeys/products")).toBe(
    "catalog",
  );
  for (const p of [
    { ...policy, kind: ["gift"] },
    { ...policy, enabled: 1 },
    { ...policy, extra: true },
  ])
    expect(() => f.j.save("owner", p)).toThrow();
  for (const p of [
    { ...f.body(), kind: ["app"] },
    { ...f.body(), credits: 99 },
    { ...f.body(), locale: ["en"] },
    { ...f.body(), quote: { ...f.body().quote, totalMinor: 1 } },
    { ...f.body(), quote: { ...f.body().quote, productRevision: 0 } },
  ])
    expect(() => f.j.purchase(f.user, p)).toThrow();
  expect(stock(f.s)).toBe(30);
});
it("ten pending purchases are bounded without taking additional inventory", () => {
  const f = setup();
  for (let n = 0; n < 10; n++) f.j.purchase(f.user, f.body());
  expect(() => f.j.purchase(f.user, f.body())).toThrow(/limit/);
  expect(stock(f.s)).toBe(20);
});
it("expired unclaimed gift returns actual escrow and a later refund does not duplicate it", () => {
  const f = setup("gift"),
    p = f.j.purchase(f.user, f.body());
  f.s.recordTestPayment(p.orderId);
  f.s.expireGifts(Date.now() + 31 * 86400000);
  expect(f.s.balance(f.user)).toBe(3);
  expect(f.j.get(f.user, p.orderId).gift?.status).toBe("expired");
  f.s.requestReturn(f.user, p.orderId);
  f.s.refund("finance", p.orderId);
  expect(f.s.balance(f.user)).toBe(0);
  expect(stock(f.s)).toBe(30);
});

it("digital delivery cannot be recorded as a physical shipment", () => {
  const f = setup(),
    p = f.j.purchase(f.user, f.body());
  f.s.recordTestPayment(p.orderId);
  expect(() =>
    f.s.fulfill("fulfillment", p.orderId, "INVENTED-PHYSICAL-TRACK"),
  ).toThrow(/online|app/);
  expect(f.s.db.prepare("SELECT COUNT(*) n FROM fulfillments").get()!.n).toBe(
    0,
  );
  expect(f.j.get(f.user, p.orderId).status).toBe("paid");
});
