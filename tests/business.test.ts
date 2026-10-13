import { afterEach, expect, it } from "vitest";
import { BusinessStore } from "../server/business-store";
import { CustomerStore } from "../server/customer-store";
const stores: CustomerStore[] = [];
function setup() {
  const store = new CustomerStore(":memory:", "p".repeat(32), "k".repeat(32));
  store.seed();
  stores.push(store);
  return { store, b: new BusinessStore(store), u: store.createGuest().id };
}
afterEach(() => stores.splice(0).forEach((s) => s.close()));
it("settings use revision checks, support Cyrillic owner text and reject punctuation masquerading as a phone", () => {
  const { b } = setup();
  expect(b.settings().pickupAddress).toBe("");
  const old = b.settings(),
    next = b.saveSettings("owner", {
      ...old,
      homeTitle: { ...old.homeTitle, "uz-Cyrl": "Ўз матним" },
      pickupAddress: "Real configured pickup",
    });
  expect(next.homeTitle["uz-Cyrl"]).toBe("Ўз матним");
  expect(() => b.saveSettings("owner", old)).toThrow(/another window/);
  expect(() =>
    b.saveSettings("owner", { ...next, sellerPhone: "-------" }),
  ).toThrow(/Invalid/);
});
it("server totals and immutable commerce survive a lost-response retry and later store changes", () => {
  const { store: s, b, u } = setup();
  let config = b.saveSettings("owner", {
    ...b.settings(),
    pickupAddress: "Pickup A",
    sellerName: "Seller A",
    paymentDetails: "Payment A",
    deliveryEnabled: true,
    deliveryFeeMinor: 10000,
  });
  const items = [{ productId: "dev-circle", quantity: 1 }],
    address = {
      name: "Recipient",
      phone: "+998 90 123 45 67",
      city: "",
      street: "",
      deliveryMethod: "pickup",
    };
  const price = Number(
    s.products().find((p) => p.id === "dev-circle")!.price_minor,
  );
  const quote = { totalMinor: price, settingsRevision: config.revision };
  const order = s.submitOrder(u, items, address, "stable-retry", quote);
  config = b.saveSettings("owner", {
    ...config,
    pickupAddress: "",
    sellerName: "Seller B",
    paymentDetails: "Payment B",
    deliveryEnabled: false,
    deliveryFeeMinor: 20000,
  });
  expect(s.submitOrder(u, items, address, "stable-retry", quote).id).toBe(
    order.id,
  );
  expect(s.orders(u)[0].commerce).toMatchObject({
    sellerName: "Seller A",
    paymentDetails: "Payment A",
    pickupAddress: "Pickup A",
    method: "pickup",
    feeMinor: 0,
  });
  expect(() =>
    s.submitOrder(
      u,
      items,
      { ...address, name: "Another person" },
      "stable-retry",
      quote,
    ),
  ).toThrow(/differ/);
  expect(s.orders(u)).toHaveLength(1);
  expect(() =>
    s.submitOrder(u, items, address, "new-order", {
      totalMinor: price,
      settingsRevision: config.revision,
    }),
  ).toThrow(/Pickup unavailable/);
});
it("courier fee is server-computed, stale quotes roll back stock and pickup needs no fake address", () => {
  const { store: s, b, u } = setup();
  const config = b.saveSettings("owner", {
    ...b.settings(),
    pickupAddress: "Pickup",
    deliveryEnabled: true,
    deliveryFeeMinor: 12500,
  });
  const p = s.products().find((p) => p.id === "dev-circle")!,
    items = [{ productId: String(p.id), quantity: 1 }],
    address = {
      name: "Person",
      phone: "901234567",
      city: "Tashkent",
      street: "Street 42",
      deliveryMethod: "courier",
    };
  expect(() =>
    s.submitOrder(u, items, address, "stale", {
      totalMinor: Number(p.price_minor),
      settingsRevision: config.revision,
    }),
  ).toThrow(/changed|quote|review/i);
  expect(s.products().find((q) => q.id === p.id)!.stock).toBe(p.stock);
  const order = s.submitOrder(u, items, address, "correct", {
    totalMinor: Number(p.price_minor) + 12500,
    settingsRevision: config.revision,
  });
  expect(order.total_minor).toBe(Number(p.price_minor) + 12500);
  expect(() =>
    s.submitOrder(u, items, { ...address, phone: "-------" }, "bad"),
  ).toThrow(/Invalid/);
});
it("global announcements support scheduled visibility, idempotent creation, guarded edits and retirement", () => {
  const { b } = setup(),
    now = Date.now(),
    input = {
      title: "Test",
      body: "Local test only",
      kind: "news" as const,
      startsAt: now + 1000,
      endsAt: now + 100000,
      requestKey: "same",
    };
  const created = b.publish("owner", input);
  expect(b.publish("owner", input).id).toBe(created.id);
  expect(b.announcements(false, now)).toHaveLength(0);
  expect(b.announcements(false, now + 2000)).toHaveLength(1);
  expect(() => b.publish("owner", { ...input, body: "Different" })).toThrow(
    /differ/,
  );
  const edited = b.publish("owner", {
    ...input,
    id: created.id,
    revision: created.revision,
    title: "Edited",
  });
  expect(() =>
    b.publish("owner", {
      ...input,
      id: created.id,
      revision: created.revision,
    }),
  ).toThrow(/another window/);
  b.revoke("owner", edited.id, edited.revision);
  expect(b.announcements(false, now + 2000)).toHaveLength(0);
  expect(() =>
    b.publish("owner", {
      ...input,
      requestKey: "targeted",
      recipient: "someone",
    } as never),
  ).toThrow(/global/);
});
