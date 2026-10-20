import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { CatalogStore } from "../server/catalog-store";
import { BusinessStore } from "../server/business-store";
import { PartnerStore } from "../server/partner-store";
import { OfferStore } from "../server/offer-store";
import type { CatalogSku } from "../src/catalog-types";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  const c = new CatalogStore(s),
    b = new BusinessStore(s);
  b.saveSettings("owner", {
    ...b.settings(),
    pickupAddress: "Synthetic catalog pickup",
  });
  const buyer = s.createGuest();
  s.db.prepare("UPDATE users SET role='maker' WHERE id=?").run(buyer.id);
  return { s, c, b, buyer };
}
function put(
  s: KitStore,
  c: CatalogStore,
  id: string,
  kind: CatalogSku["kind"],
  parts: CatalogSku["parts"] = [],
  patch: Record<string, unknown> = {},
) {
  const old = s.products().find((p) => p.id === id),
    existing = c.sku(id),
    sku: CatalogSku = {
      version: "catalog-sku/1",
      productId: id,
      kind,
      group: "original-kits",
      label: id,
      material: "Original measured test material",
      sellable: true,
      parts,
      revision: existing?.revision ?? 0,
    };
  return c.save("owner", {
    product: {
      id,
      name: typeof old?.name === "string" ? old.name : id,
      family: "string",
      price_minor: old?.price_minor ?? 10000,
      stock: old?.stock ?? 100,
      credits: old?.credits ?? 3,
      description: "Original fixture",
      expectedRevision: old?.revision ?? 0,
      active: old?.active ?? 1,
      profile_id: "standard-base-r1",
      ...patch,
    },
    sku,
  });
}
function composition() {
  const f = setup();
  put(f.s, f.c, "base-kit", "kit", [], { stock: 10 });
  put(f.s, f.c, "black-thread", "refill", [], {
    stock: 20,
    credits: 0,
    price_minor: 1000,
  });
  put(
    f.s,
    f.c,
    "duo-kit",
    "bundle",
    [
      { productId: "base-kit", quantity: 2 },
      { productId: "black-thread", quantity: 1 },
    ],
    { price_minor: 18000, credits: 6 },
  );
  return f;
}
const address = {
  name: "Synthetic catalog buyer",
  phone: "901234567",
  city: "",
  street: "",
  deliveryMethod: "pickup",
};
function order(
  f: ReturnType<typeof composition>,
  items = [{ productId: "duo-kit", quantity: 1 }],
  key = randomUUID(),
  revision = f.c.revision(),
) {
  const total = items.reduce(
    (n, i) =>
      n +
      Number(f.s.products().find((p) => p.id === i.productId)!.price_minor) *
        i.quantity,
    0,
  );
  return f.s.submitOrder(f.buyer.id, items, address, key, {
    totalMinor: total,
    settingsRevision: f.b.settings().revision,
    catalogRevision: revision,
  });
}
const stock = (s: KitStore, id: string) =>
  Number(s.products().find((p) => p.id === id)!.stock);
it("bundle availability aggregates shared physical component paths instead of overselling the same parts", () => {
  const { s, c } = composition();
  expect(c.available("duo-kit")).toBe(5);
  expect(Number(s.catalog().find((p) => p.id === "duo-kit")!.stock)).toBe(5);
  put(s, c, "variant-one", "variant", [{ productId: "base-kit", quantity: 1 }]);
  put(s, c, "variant-two", "variant", [{ productId: "base-kit", quantity: 1 }]);
  put(
    s,
    c,
    "shared-duo",
    "bundle",
    [
      { productId: "variant-one", quantity: 1 },
      { productId: "variant-two", quantity: 1 },
    ],
    { credits: 6 },
  );
  expect(c.available("shared-duo")).toBe(5);
});
it("a bundle plus its direct component reserves exactly once; accepted retry and cancellation use original composition", () => {
  const f = composition(),
    items = [
      { productId: "duo-kit", quantity: 2 },
      { productId: "base-kit", quantity: 1 },
    ],
    key = randomUUID(),
    revision = f.c.revision(),
    o = order(f, items, key, revision);
  expect(stock(f.s, "duo-kit")).toBe(98);
  expect(stock(f.s, "base-kit")).toBe(5);
  expect(stock(f.s, "black-thread")).toBe(18);
  expect(f.c.available("duo-kit")).toBe(2);
  put(
    f.s,
    f.c,
    "duo-kit",
    "bundle",
    [
      { productId: "base-kit", quantity: 4 },
      { productId: "black-thread", quantity: 3 },
    ],
    { name: "New composition title" },
  );
  expect(order(f, items, key, revision).id).toBe(o.id);
  expect(f.c.snapshot("order:" + o.id)![0].name).toBe("duo-kit");
  expect(
    f.s.orders(f.buyer.id)[0].items.find((i) => i.product_id === "duo-kit")!
      .name,
  ).toBe("duo-kit");
  f.s.cancelOrder(f.buyer.id, o.id);
  f.s.cancelOrder(f.buyer.id, o.id);
  expect(stock(f.s, "duo-kit")).toBe(100);
  expect(stock(f.s, "base-kit")).toBe(10);
  expect(stock(f.s, "black-thread")).toBe(20);
});
it("missing or stale catalog review and aggregate shortages cannot leave partial orders or stock", () => {
  const f = composition();
  expect(() =>
    order(f, [{ productId: "duo-kit", quantity: 1 }], randomUUID(), 0),
  ).toThrow("Catalog changed");
  expect(() =>
    f.s.submitOrder(
      f.buyer.id,
      [{ productId: "duo-kit", quantity: 1 }],
      address,
      randomUUID(),
      { totalMinor: 18000, settingsRevision: f.b.settings().revision },
    ),
  ).toThrow("Catalog changed");
  expect(() =>
    order(f, [
      { productId: "duo-kit", quantity: 3 },
      { productId: "base-kit", quantity: 6 },
    ]),
  ).toThrow("stock unavailable");
  expect(stock(f.s, "base-kit")).toBe(10);
  expect(stock(f.s, "duo-kit")).toBe(100);
  expect(f.s.db.prepare("SELECT COUNT(*) n FROM orders").get()!.n).toBe(0);
});
it("real paid return/refund restores original components once and reverses only its actual build credits", () => {
  const f = composition(),
    o = order(f);
  f.s.recordTestPayment(o.id);
  expect(f.s.kitBalance(f.buyer.id)).toBe(6);
  put(f.s, f.c, "duo-kit", "bundle", [
    { productId: "base-kit", quantity: 5 },
    { productId: "black-thread", quantity: 2 },
  ]);
  f.s.requestReturn(f.buyer.id, o.id);
  f.s.refund("owner", o.id);
  f.s.refund("owner", o.id);
  expect(f.s.kitBalance(f.buyer.id)).toBe(0);
  expect(stock(f.s, "base-kit")).toBe(10);
  expect(stock(f.s, "black-thread")).toBe(20);
  expect(stock(f.s, "duo-kit")).toBe(100);
});
it("warehouse supplies work in bundles but not direct checkout; malformed refills and unknown SKU fields roll back", () => {
  const f = composition(),
    old = f.c.sku("black-thread")!,
    p = f.s.products().find((p) => p.id === "black-thread")!;
  f.c.save("owner", {
    product: {
      id: p.id,
      name: p.name,
      family: p.family,
      price_minor: p.price_minor,
      stock: p.stock,
      credits: p.credits,
      description: p.description,
      expectedRevision: p.revision,
      active: p.active,
      profile_id: p.profile_id,
    },
    sku: { ...old, sellable: false },
  });
  expect(f.s.catalog().some((p) => p.id === "black-thread")).toBe(false);
  expect(() => order(f, [{ productId: "black-thread", quantity: 1 }])).toThrow(
    "not sold",
  );
  expect(order(f).total_minor).toBe(18000);
  expect(() =>
    put(f.s, f.c, "bad-refill", "refill", [], { credits: 1 }),
  ).toThrow("cannot silently grant");
  expect(f.s.products().some((p) => p.id === "bad-refill")).toBe(false);
  expect(() =>
    put(f.s, f.c, "bad-currency", "kit", [], { currency: ["USD"] }),
  ).toThrow("product fields");
});
it("SKU cycles, missing parts and ancestor depth violations roll back all nested product metadata writes", () => {
  const f = composition(),
    before = f.c.revision(),
    base = f.c.sku("base-kit");
  expect(() =>
    put(f.s, f.c, "base-kit", "bundle", [
      { productId: "duo-kit", quantity: 2 },
    ]),
  ).toThrow("cycle");
  expect(f.c.sku("base-kit")).toEqual(base);
  expect(f.c.revision()).toBe(before);
  expect(() =>
    put(f.s, f.c, "missing-parts", "bundle", [
      { productId: "does-not-exist", quantity: 2 },
    ]),
  ).toThrow("not found");
  expect(f.s.products().some((p) => p.id === "missing-parts")).toBe(false);
  put(f.s, f.c, "leaf-kit", "kit");
  put(f.s, f.c, "bottom-kit", "kit");
  put(f.s, f.c, "ancestor-kit", "variant", [
    { productId: "bottom-kit", quantity: 1 },
  ]);
  put(f.s, f.c, "chain-one", "variant", [
    { productId: "leaf-kit", quantity: 1 },
  ]);
  put(f.s, f.c, "chain-two", "variant", [
    { productId: "chain-one", quantity: 1 },
  ]);
  put(f.s, f.c, "chain-three", "variant", [
    { productId: "chain-two", quantity: 1 },
  ]);
  const revision = f.c.revision();
  expect(() =>
    put(f.s, f.c, "bottom-kit", "variant", [
      { productId: "chain-three", quantity: 1 },
    ]),
  ).toThrow("depth");
  expect(f.c.revision()).toBe(revision);
  expect(f.c.sku("bottom-kit")!.kind).toBe("kit");
});
it("an injected reservation failure rolls parent/components/order lines back; retry creates one order", () => {
  const f = composition();
  f.s.db.exec(
    "CREATE TRIGGER fail_catalog_reservation BEFORE INSERT ON catalog_reservations BEGIN SELECT RAISE(ABORT,'injected inventory failure'); END;",
  );
  expect(() => order(f)).toThrow("injected inventory");
  expect(stock(f.s, "base-kit")).toBe(10);
  expect(stock(f.s, "black-thread")).toBe(20);
  expect(stock(f.s, "duo-kit")).toBe(100);
  expect(f.s.db.prepare("SELECT COUNT(*) n FROM orders").get()!.n).toBe(0);
  expect(f.s.db.prepare("SELECT COUNT(*) n FROM order_lines").get()!.n).toBe(0);
  f.s.db.exec("DROP TRIGGER fail_catalog_reservation");
  expect(order(f).total_minor).toBe(18000);
});
it("partner authorization reserves physical bundle parts and cancellation restores the original allocation once", () => {
  const f = composition(),
    p = new PartnerStore(f.s);
  p.save("owner", {
    accountId: f.buyer.id,
    terms: {
      name: "Original bundle partner",
      productId: "duo-kit",
      enabled: true,
      maxKits: 5,
      minBatch: 2,
      maxBatch: 5,
      codeDays: 30,
      creditDays: 0,
      tiers: [{ minCount: 2, unitMinor: 16000 }],
      revision: 0,
    },
  });
  const q = p.quote(f.buyer.id, { count: 2, requestKey: randomUUID() });
  expect(q.catalogRevision).toBe(f.c.revision());
  const requested = p.request(f.buyer.id, {
      quoteId: q.id,
      name: "Original bundle campaign",
      requestKey: randomUUID(),
    }),
    ready = p.approve("owner", requested.id, {
      revision: requested.revision,
      authorizeIssue: true,
    });
  expect(stock(f.s, "base-kit")).toBe(6);
  expect(stock(f.s, "black-thread")).toBe(18);
  expect(stock(f.s, "duo-kit")).toBe(98);
  p.cancel("owner", ready.id, ready.revision);
  expect(stock(f.s, "base-kit")).toBe(10);
  expect(stock(f.s, "black-thread")).toBe(20);
  expect(stock(f.s, "duo-kit")).toBe(100);
});
it("a promo's original component quote cannot be bypassed by supplying a newer client catalog revision", () => {
  const f = composition(),
    o = new OfferStore(f.s);
  o.saveCode("owner", {
    code: "BUNDLE10",
    rule: {
      discountType: "percent",
      value: 1000,
      maxDiscountMinor: 100000,
      minSubtotalMinor: 0,
      startsAt: Date.now() - 1000,
      expiresAt: Date.now() + 86400000,
      maxUses: 10,
      perAccountLimit: 1,
      enabled: true,
      revision: 0,
    },
  });
  const items = [{ productId: "duo-kit", quantity: 1 }],
    q = o.quote(f.buyer.id, items, "pickup", "BUNDLE10");
  put(f.s, f.c, "duo-kit", "bundle", [{ productId: "base-kit", quantity: 3 }]);
  expect(() =>
    f.s.submitOrder(f.buyer.id, items, address, randomUUID(), {
      totalMinor: q.totalMinor,
      settingsRevision: q.settingsRevision,
      offerQuoteId: q.id,
      catalogRevision: f.c.revision(),
    }),
  ).toThrow("Offer quote changed");
  expect(stock(f.s, "base-kit")).toBe(10);
});

it("a pre-SKU imported order identifier still cancels exactly once without an inventory reservation", () => {
  const { s, buyer } = setup(),
    id = "imported-before-skus";
  s.db
    .prepare("INSERT INTO orders VALUES(?,?,'pending',550000,'UZS',?,?,?)")
    .run(
      id,
      buyer.id,
      JSON.stringify(address),
      new Date().toISOString(),
      "original-import-key",
    );
  s.db
    .prepare("INSERT INTO order_lines VALUES(?,'dev-circle',1,550000,1)")
    .run(id);
  s.db.prepare("UPDATE products SET stock=7 WHERE id='dev-circle'").run();
  s.cancelOrder(buyer.id, id);
  s.cancelOrder(buyer.id, id);
  expect(stock(s, "dev-circle")).toBe(8);
});

it("ordinary product editor cannot give refill credits and invalidates reviewed SKU terms", () => {
  const f = composition(),
    p = f.s.products().find((p) => p.id === "black-thread")!,
    before = f.c.revision();
  expect(() =>
    f.s.updateProduct("owner", {
      ...p,
      expectedRevision: p.revision,
      credits: 1,
    }),
  ).toThrow(/Refills/);
  expect(f.c.revision()).toBe(before);
  f.s.updateProduct("owner", {
    ...p,
    expectedRevision: p.revision,
    description: "Changed material terms",
  });
  expect(f.c.revision()).toBeGreaterThan(before);
  expect(() => order(f, undefined, randomUUID(), before)).toThrow(/changed/);
});

it("atomic SKU editor can deliberately change refill type while ordinary product edits remain guarded", () => {
  const f = composition();
  put(f.s, f.c, "black-thread", "kit", [], { credits: 3 });
  expect(f.c.sku("black-thread")!.kind).toBe("kit");
  expect(f.s.products().find((p) => p.id === "black-thread")!.credits).toBe(3);
});
