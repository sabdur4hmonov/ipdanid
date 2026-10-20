import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { BusinessStore } from "../server/business-store";
import { RegionsStore } from "../server/regions-store";
import { Payments } from "../server/payments";
import { adminRoutePermission } from "../server/admin-access";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
const address = {
  name: "Synthetic buyer",
  phone: "901234567",
  city: "Synthetic city",
  street: "Synthetic street",
  deliveryMethod: "courier",
  country: "US",
};
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  const b = new BusinessStore(s);
  b.saveSettings("owner", {
    ...b.settings(),
    pickupAddress: "Legacy pickup",
    deliveryEnabled: true,
    deliveryFeeMinor: 500,
  });
  const r = new RegionsStore(s),
    user = s.createGuest().id;
  return { s, b, r, user };
}
function product(f: ReturnType<typeof setup>, currency = "USD") {
  const p = f.s.products().find((p) => p.id === "dev-circle")!;
  return f.s.updateProduct("owner", {
    ...p,
    price_minor: 10000,
    expectedRevision: p.revision,
    currency,
  });
}
const rule = {
  country: "US",
  currency: "USD",
  enabled: true,
  pickupAddress: "Synthetic US pickup",
  courierEnabled: true,
  courierFeeMinor: 700,
};
function checkout(f: ReturnType<typeof setup>, key = randomUUID(), patch = {}) {
  return f.s.submitOrder(
    f.user,
    [{ productId: "dev-circle", quantity: 1 }],
    address,
    key,
    {
      totalMinor: 10000 + 700,
      settingsRevision: f.b.settings().revision,
      currency: "USD",
      shippingRevision: f.r.policy().revision,
      ...patch,
    },
  );
}
it("stores explicit currency and preserves it for old product editor clients", () => {
  const f = setup();
  product(f);
  expect(f.s.products().find((p) => p.id === "dev-circle")!.currency).toBe(
    "USD",
  );
  const p = f.s.products().find((p) => p.id === "dev-circle")!;
  const { currency, ...legacy } = p;
  void currency;
  f.s.updateProduct("owner", { ...legacy, expectedRevision: p.revision });
  expect(f.s.products().find((p) => p.id === "dev-circle")!.currency).toBe(
    "USD",
  );
});
it("regional exact shipping and currency are captured; original retry survives policy changes", () => {
  const f = setup();
  product(f);
  f.r.save("owner", { revision: 0, regions: [rule] });
  const key = randomUUID(),
    first = checkout(f, key);
  expect(first.currency).toBe("USD");
  expect(first.total_minor).toBe(10700);
  const saved = f.s.orders(f.user)[0].commerce;
  expect(saved).toMatchObject({
    country: "US",
    currency: "USD",
    feeMinor: 700,
    shippingRevision: 1,
    pickupAddress: rule.pickupAddress,
  });
  f.r.save("owner", {
    revision: 1,
    regions: [{ ...rule, courierFeeMinor: 800 }],
  });
  expect(checkout(f, key, { shippingRevision: 1 }).id).toBe(first.id);
  expect(() => checkout(f, randomUUID(), { shippingRevision: 1 })).toThrow(
    /Shipping changed/,
  );
  expect(() => checkout(f, key, { shippingRevision: 2 })).toThrow(/retry/);
});
it("refuses mixed carts, missing currency, foreign destinations, disabled delivery and silent UZS conversion", () => {
  const f = setup();
  product(f);
  f.r.save("owner", { revision: 0, regions: [rule] });
  expect(() => checkout(f, randomUUID(), { currency: undefined })).toThrow(
    /Currency/,
  );
  const base = f.s.products().find((p) => p.id === "dev-circle")!;
  f.s.updateProduct("owner", {
    ...base,
    id: "uzs-other",
    currency: "UZS",
    expectedRevision: 0,
  });
  expect(() =>
    f.s.submitOrder(
      f.user,
      [
        { productId: "dev-circle", quantity: 1 },
        { productId: "uzs-other", quantity: 1 },
      ],
      address,
      randomUUID(),
      {
        totalMinor: 20700,
        settingsRevision: f.b.settings().revision,
        currency: "USD",
        shippingRevision: 1,
      },
    ),
  ).toThrow(/Mixed currencies/);
  expect(() =>
    f.r.quote([{ productId: "dev-circle", quantity: 1 }], "UZ", "courier", 1),
  ).toThrow(/not served/);
  f.r.save("owner", {
    revision: 1,
    regions: [{ ...rule, courierEnabled: false }],
  });
  expect(() => checkout(f)).toThrow(/Delivery unavailable/);
  expect(f.s.orders(f.user)).toHaveLength(0);
});
it("retains legacy UZS delivery behavior and payment retry", () => {
  const f = setup();
  const p = f.s.products().find((p) => p.id === "dev-circle")!;
  const key = randomUUID(),
    a = { ...address, country: "UZ" },
    q = {
      totalMinor: Number(p.price_minor) + 500,
      settingsRevision: f.b.settings().revision,
    };
  const o = f.s.submitOrder(
    f.user,
    [{ productId: "dev-circle", quantity: 1 }],
    a,
    key,
    q,
  );
  expect(o.currency).toBe("UZS");
  expect(f.s.orders(f.user)[0].commerce).not.toHaveProperty("shippingRevision");
  expect(
    f.s.submitOrder(
      f.user,
      [{ productId: "dev-circle", quantity: 1 }],
      a,
      key,
      q,
    ).id,
  ).toBe(o.id);
});
it("refuses Click and Payme non-UZS invoices before recording anything; mock settlement uses real currency", () => {
  const f = setup();
  product(f);
  f.r.save("owner", { revision: 0, regions: [rule] });
  const o = checkout(f),
    p = new Payments(f.s, {
      mode: "sandbox",
      click: { serviceId: "12345", secret: "synthetic-click-test" },
      payme: { login: "Paycom-test", secret: "synthetic-payme-test" },
    });
  for (const provider of ["click", "payme"] as const)
    expect(() => p.createInvoice(f.user, provider, o.id, randomUUID())).toThrow(
      /UZS/,
    );
  expect(
    f.s.db.prepare("SELECT COUNT(*) n FROM payment_invoices").get()!.n,
  ).toBe(0);
  expect(() => f.s.recordTestPayment(o.id)).not.toThrow();
  expect(f.s.orders(f.user)[0].status).toBe("paid");
});
it("validates rules, CAS and settings scope", () => {
  const f = setup();
  expect(adminRoutePermission("POST", "/api/admin/regions")).toBe("settings");
  for (const regions of [
    [rule, rule],
    [{ ...rule, currency: ["USD"] }],
    [{ ...rule, courierFeeMinor: -1 }],
    [{ ...rule, pickupAddress: "bad\naddress" }],
  ])
    expect(() => f.r.save("owner", { revision: 0, regions })).toThrow();
  expect(f.r.policy().revision).toBe(0);
  f.r.save("owner", { revision: 0, regions: [rule] });
  expect(() => f.r.save("owner", { revision: 0, regions: [] })).toThrow(
    /changed/,
  );
  expect(f.r.policy().revision).toBe(1);
});
