import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { JourneyStore } from "../server/journey-store";
import { CommissionStore } from "../server/commission-store";
import { CatalogStore } from "../server/catalog-store";
import { RegionsStore } from "../server/regions-store";
import { BusinessStore } from "../server/business-store";
import { adminRoutePermission } from "../server/admin-access";
import {TransactionalOutbox} from '../server/transactional-outbox';
import {emailAdapter} from '../server/email-adapter';
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import type { Commission } from "../src/commission-types";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
async function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  new TransactionalOutbox(s,'p'.repeat(32),emailAdapter({}));
  const cat = new CatalogStore(s),
    b = new BusinessStore(s);
  new RegionsStore(s);
  const j = new JourneyStore(s),
    c = new CommissionStore(s);
  const user = s.createGuest().id,
    other = s.createGuest().id;
  s.db
    .prepare("UPDATE users SET role='maker' WHERE id IN (?,?)")
    .run(user, other);
  const i = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
  });
  const code = s.issueCode("dev-circle", 2, Date.now() + 60000, "owner");
  s.redeemCode(user, code.code);
  const job = s.reserveGeneration(user, "commission-save", i.sequenceHash);
  s.finishGeneration(user, job.id, i);
  const instructionId = String(s.instructions(user)[0].id);
  s.updateProduct("owner", {
    id: "ready-art",
    name: "Original made-to-order art",
    family: "string",
    price_minor: 10000,
    currency: "UZS",
    stock: 4,
    credits: 0,
    description: "Hand assembled",
    expectedRevision: 0,
    active: 1,
    profile_id: i.profile.id,
  });
  c.save("owner", {
    version: "commission-product/1",
    productId: "ready-art",
    enabled: true,
    revision: 0,
  });
  b.saveSettings("owner", {
    ...b.settings(),
    pickupAddress: "Original studio",
    deliveryEnabled: true,
    deliveryFeeMinor: 2000,
  });
  const request = {
    instructionId,
    productId: "ready-art",
    consent: true,
    locale: "en",
    requestKey: randomUUID(),
  };
  const submit = () => c.request(user, request);
  const approve = (r: Commission) =>
    c.review("owner", r.id, {
      revision: r.revision,
      artHash: r.artHash,
      decision: "approve",
      note: "Exact art and board reviewed",
      quote: c.reviewQuote(r.id),
    });
  const acceptBody = (r: Commission) => ({
    revision: r.revision,
    artHash: r.artHash,
    requestKey: randomUUID(),
    address: {
      name: "Synthetic Buyer",
      phone: "+998901234567",
      country: "UZ",
      deliveryMethod: "pickup" as const,
      city: "",
      street: "",
    },
    quote: {
      totalMinor: 10000,
      settingsRevision: b.settings().revision,
      catalogRevision: cat.revision(),
      currency: "UZS" as const,
      shippingRevision: 0,
    },
  });
  return {
    s,
    cat,
    b,
    j,
    c,
    user,
    other,
    i,
    request,
    submit,
    approve,
    acceptBody,
  };
}
it("requires explicit sharing consent and an owned server archive; creates no order or stock reservation before acceptance", async () => {
  const f = await setup(),
    stock = Number(f.s.products().find((p) => p.id === "ready-art")!.stock);
  expect(() => f.c.request(f.user, { ...f.request, consent: false })).toThrow(
    /consent/,
  );
  expect(() => f.c.request(f.other, f.request)).toThrow(/not found/);
  const guest = f.s.createGuest();
  expect(() => f.c.request(guest.id, f.request)).toThrow(/Register/);
  const r = f.submit();
  expect(f.submit().id).toBe(r.id);
  expect(f.s.orders(f.user)).toHaveLength(0);
  expect(Number(f.s.products().find((p) => p.id === "ready-art")!.stock)).toBe(
    stock,
  );
  expect(() => f.c.request(f.user, { ...f.request, locale: "ru" })).toThrow(
    /retry/,
  );
  expect(f.c.list(f.other)).toEqual([]);
  expect(() => f.c.get(f.other, r.id)).toThrow(/not found/);
  expect(() => f.c.guide(f.other, r.id)).toThrow(/not found/);
  expect(f.c.guide(f.user, r.id).instruction).toEqual(f.i);
  expect(JSON.stringify(r)).not.toContain("segments");
  expect(JSON.stringify(f.c.list())).not.toContain("buyer");
});
it("binds exact reviewed art, revision, server price, region and immutable production sequence with one real order", async () => {
  const f = await setup(),
    r = f.submit();
  expect(() => f.c.accept(f.user, r.id, f.acceptBody(r))).toThrow(/approved/);
  const a = f.approve(r),
    body = f.acceptBody(a),
    balance = f.s.balance(f.user);
  expect(() => f.c.accept(f.other, a.id, body)).toThrow(/not found/);
  expect(() =>
    f.c.accept(f.user, a.id, { ...body, artHash: "0".repeat(64) }),
  ).toThrow(/review|Review/);
  expect(() =>
    f.c.accept(f.user, a.id, {
      ...body,
      quote: { ...body.quote, totalMinor: 1 },
    }),
  ).toThrow(/Prices/);
  expect(() =>
    f.s.submitOrder(
      f.user,
      [{ productId: "ready-art", quantity: 1 }],
      body.address,
      randomUUID(),
      body.quote,
    ),
  ).toThrow(/commission flow/);
  const accepted = f.c.accept(f.user, a.id, body);
  expect(accepted.order).toMatchObject({
    status: "pending",
    totalMinor: 10000,
    currency: "UZS",
  });
  expect(f.c.accept(f.user, a.id, body).order?.id).toBe(accepted.order?.id);
  expect(f.s.orders(f.user)).toHaveLength(1);
  expect(() =>
    f.c.accept(f.user, a.id, { ...body, requestKey: randomUUID() }),
  ).toThrow(/retry/);
  f.s.recordTestPayment(accepted.order!.id);
  expect(f.s.balance(f.user)).toBe(balance);
  expect(() => f.s.fulfill("owner", accepted.order!.id, "TRACK-1")).toThrow(
    /ready/,
  );
  expect(() =>
    f.c.produce("owner", a.id, {
      artHash: a.artHash,
      revision: accepted.revision,
      state: "ready",
    }),
  ).toThrow(/next production/);
  const making = f.c.produce("owner", a.id, {
    artHash: a.artHash,
    revision: accepted.revision,
    state: "making",
  });
  const ready = f.c.produce("owner", a.id, {
    artHash: a.artHash,
    revision: making.revision,
    state: "ready",
  });
  expect(ready.production).toBe("ready");
  f.s.fulfill("owner", accepted.order!.id, "TRACK-1");
  expect(f.c.get(f.user, a.id).order).toMatchObject({
    status: "fulfilled",
    tracking: ["TRACK-1"],
  });
  expect(f.c.guide(undefined, a.id).instruction).toEqual(f.i);
});
it("stale art, product, catalog, settings and retired policy refuse acceptance without side effects", async () => {
  const f = await setup(),
    a = f.approve(f.submit()),
    body = f.acceptBody(a);
  expect(() =>
    f.c.review("owner", a.id, {
      revision: 1,
      artHash: a.artHash,
      decision: "reject",
      note: "",
      quote: null,
    }),
  ).toThrow(/changed/);
  f.b.saveSettings("owner", {
    ...f.b.settings(),
    paymentDetails: "Changed seller",
  });
  expect(() => f.c.accept(f.user, a.id, body)).toThrow(/Prices/);
  expect(f.s.orders(f.user)).toHaveLength(0);
  const refreshed = f.approve(a),
    newBody = f.acceptBody(refreshed),
    p = f.s.products().find((p) => p.id === "ready-art")!;
  f.s.updateProduct("owner", {
    ...p,
    description: "Changed item",
    expectedRevision: p.revision,
  });
  expect(() => f.c.accept(f.user, a.id, newBody)).toThrow(/changed/);
  expect(f.s.orders(f.user)).toHaveLength(0);
  const again = f.approve(refreshed);
  f.c.save("owner", { ...f.c.policy("ready-art")!, enabled: false });
  expect(() => f.c.accept(f.user, a.id, f.acceptBody(again))).toThrow(
    /changed/,
  );
  expect(f.s.orders(f.user)).toHaveLength(0);
});
it("cancel and pre-production refund restore original stock once; making cannot silently refund", async () => {
  const f = await setup(),
    r = f.approve(f.submit()),
    accepted = f.c.accept(f.user, r.id, f.acceptBody(r));
  f.c.cancel(f.user, r.id, accepted.revision);
  f.c.cancel(f.user, r.id, accepted.revision);
  expect(f.s.products().find((p) => p.id === "ready-art")!.stock).toBe(4);
  expect(() => f.approve(f.c.get(f.user, r.id))).toThrow(/changed/);
  const a = f.approve(
      f.c.request(f.user, { ...f.request, requestKey: randomUUID() }),
    ),
    second = f.c.accept(f.user, a.id, f.acceptBody(a));
  expect(() =>
    f.c.produce("owner", a.id, {
      revision: second.revision,
      artHash: a.artHash,
      state: "making",
    }),
  ).toThrow(/Paid/);
  f.s.recordTestPayment(second.order!.id);
  f.s.requestReturn(f.user, second.order!.id);
  f.s.refund("finance", second.order!.id);
  f.s.refund("finance", second.order!.id);
  expect(f.s.products().find((p) => p.id === "ready-art")!.stock).toBe(4);
  const a3 = f.approve(
      f.c.request(f.user, { ...f.request, requestKey: randomUUID() }),
    ),
    third = f.c.accept(f.user, a3.id, f.acceptBody(a3));
  f.s.recordTestPayment(third.order!.id);
  f.c.produce("owner", a3.id, {
    revision: third.revision,
    artHash: a3.artHash,
    state: "making",
  });
  f.s.requestReturn(f.user, third.order!.id);
  expect(() => f.s.refund("finance", third.order!.id)).toThrow(
    /Production has started/,
  );
  expect(f.c.get(f.user, a3.id).order?.status).toBe("return_requested");
});
it("failure after order insertion rolls back stock, order, acceptance and audit together", async () => {
  const f = await setup(),
    r = f.approve(f.submit());
  f.s.db.exec(
    "CREATE TRIGGER fail_commission_accept BEFORE UPDATE ON commissions BEGIN SELECT RAISE(ABORT,'injected commission failure'); END",
  );
  expect(() => f.c.accept(f.user, r.id, f.acceptBody(r))).toThrow(/injected/);
  expect(f.s.orders(f.user)).toHaveLength(0);
  expect(f.s.products().find((p) => p.id === "ready-art")!.stock).toBe(4);
  expect(f.c.get(f.user, r.id).state).toBe("approved");
  expect(
    f.s.db
      .prepare(
        "SELECT COUNT(*) n FROM audit WHERE action='commission.accept-art-price'",
      )
      .get()?.n,
  ).toBe(0);
});
it("workshop must approve the displayed exact price, not silently a concurrent new price", async () => {
  const f = await setup(),
    r = f.submit(),
    quote = f.c.reviewQuote(r.id)!;
  const p = f.s.products().find((p) => p.id === "ready-art")!;
  f.s.updateProduct("owner", {
    ...p,
    price_minor: 12000,
    expectedRevision: p.revision,
  });
  expect(() =>
    f.c.review("owner", r.id, {
      revision: r.revision,
      artHash: r.artHash,
      decision: "approve",
      note: "",
      quote,
    }),
  ).toThrow(/Price changed/);
  expect(f.c.get(f.user, r.id).state).toBe("requested");
  expect(f.s.orders(f.user)).toHaveLength(0);
  const fresh = f.c.reviewQuote(r.id)!;
  expect(fresh.priceMinor).toBe(12000);
  expect(
    f.c.review("owner", r.id, {
      revision: r.revision,
      artHash: r.artHash,
      decision: "approve",
      note: "",
      quote: fresh,
    }).approval?.priceMinor,
  ).toBe(12000);
});
it("commission roles are explicit and production hooks preserve existing digital gift settlement", async () => {
  const f = await setup();
  expect(adminRoutePermission("GET", "/api/admin/commissions")).toBe("orders");
  expect(
    adminRoutePermission(
      "GET",
      "/api/admin/commissions/" + randomUUID() + "/guide",
    ),
  ).toBe("orders");
  expect(
    adminRoutePermission(
      "POST",
      "/api/admin/commissions/" + randomUUID() + "/review",
    ),
  ).toBe("fulfill");
  expect(
    adminRoutePermission(
      "POST",
      "/api/admin/commissions/" + randomUUID() + "/production",
    ),
  ).toBe("fulfill");
  expect(adminRoutePermission("POST", "/api/admin/commissions/products")).toBe(
    "catalog",
  );
  f.s.updateProduct("owner", {
    id: "gift-art",
    name: "Original gift",
    family: "digital",
    price_minor: 100,
    currency: "UZS",
    stock: 2,
    credits: 2,
    description: "",
    expectedRevision: 0,
    active: 1,
    profile_id: "board",
  });
  f.j.save("owner", {
    version: "journey-product/1",
    productId: "gift-art",
    kind: "gift",
    enabled: true,
    revision: 0,
  });
  const p = f.s.products().find((p) => p.id === "gift-art")!;
  const gift = f.j.purchase(f.user, {
    productId: "gift-art",
    kind: "gift",
    name: "Buyer",
    locale: "en",
    requestKey: randomUUID(),
    quote: {
      productRevision: p.revision,
      settingsRevision: f.b.settings().revision,
      catalogRevision: f.cat.revision(),
      currency: "UZS",
      totalMinor: 100,
    },
  });
  f.s.recordTestPayment(gift.orderId);
  expect(f.j.get(f.user, gift.orderId).gift?.claimToken).toBeTruthy();
});
