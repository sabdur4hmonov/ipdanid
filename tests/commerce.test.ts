import { afterEach, describe, it, expect } from "vitest";
import { Store } from "../server/store";
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import { progressFor } from "../src/core/validation";
const stores: Store[] = [];
function setup() {
  const s = new Store(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  return s;
}
afterEach(() => stores.splice(0).forEach((s) => s.close()));
const address = {
  name: "Test Maker",
  city: "Tashkent",
  street: "Development street",
};
describe("server-authoritative sandbox operations", () => {
  it("gift transfers conserve credits, deduplicate retries, and enforce one recipient", async () => {
    const s = setup(),
      buyer = s.createGuest(),
      a = s.createGuest(),
      b = s.createGuest();
    const code = s.issueCode(
      "dev-circle-120-dark",
      5,
      Date.now() + 60000,
      "admin",
    );
    s.redeemCode(buyer.id, code.code);
    const expiry = Date.now() + 60000,
      g = s.createGift(buyer.id, 2, expiry, "gift-one");
    expect(s.balance(buyer.id)).toBe(3);
    expect(s.createGift(buyer.id, 2, expiry, "gift-one").claimToken).toBe(
      g.claimToken,
    );
    expect(s.balance(buyer.id)).toBe(3);
    expect(() => s.createGift(buyer.id, 3, expiry, "gift-one")).toThrow(
      /differ/,
    );
    expect(() => s.createGift(buyer.id, 4, expiry, "overdraw")).toThrow(
      /Insufficient/,
    );
    expect(() => s.redeemGift(a.id, g.claimToken + "tampered")).toThrow();
    const results = await Promise.allSettled([
      Promise.resolve().then(() => s.redeemGift(a.id, g.claimToken!)),
      Promise.resolve().then(() => s.redeemGift(b.id, g.claimToken!)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(s.balance(a.id) + s.balance(b.id) + s.balance(buyer.id)).toBe(5);
    expect(s.redeemGift(a.id, g.claimToken!).alreadyRedeemed).toBe(true);
    expect(s.balance(a.id)).toBe(2);
    expect(() => s.cancelGift(buyer.id, g.id)).toThrow(/cannot be cancelled/);
    expect(() => s.cancelGift(b.id, g.id)).toThrow(/not found/);
  });
  it("unclaimed gifts refund exactly once on cancellation or expiry and cannot be reclaimed by recipients", () => {
    const s = setup(),
      buyer = s.createGuest(),
      recipient = s.createGuest();
    const code = s.issueCode(
      "dev-circle-120-dark",
      4,
      Date.now() + 60000,
      "admin",
    );
    s.redeemCode(buyer.id, code.code);
    const cancelled = s.createGift(
      buyer.id,
      2,
      Date.now() + 60000,
      "cancel-gift",
    );
    s.cancelGift(buyer.id, cancelled.id);
    s.cancelGift(buyer.id, cancelled.id);
    expect(s.balance(buyer.id)).toBe(4);
    expect(() => s.redeemGift(recipient.id, cancelled.claimToken!)).toThrow();
    const expiry = Date.now() + 2000,
      expired = s.createGift(buyer.id, 3, expiry, "expire-gift");
    expect(s.expireGifts(expiry + 1)).toBe(1);
    expect(s.expireGifts(expiry + 1)).toBe(0);
    expect(s.balance(buyer.id)).toBe(4);
    expect(() => s.redeemGift(recipient.id, expired.claimToken!)).toThrow();
    s.cancelGift(buyer.id, expired.id);
    expect(s.balance(buyer.id)).toBe(4);
    expect(
      s.createGift(buyer.id, 3, expiry, "expire-gift").claimToken,
    ).toBeUndefined();
  });
  it("unique opaque guest access isolates orders and forbids forged sessions", () => {
    const s = setup(),
      a = s.createGuest(),
      b = s.createGuest();
    expect(s.authenticate(a.token)).toBe(a.id);
    expect(() => s.authenticate("forged")).toThrow();
    const o = s.createOrder(
      a.id,
      [{ productId: "dev-circle", quantity: 1 }],
      address,
      "one",
    ) as { id: string; total_minor: number };
    expect(o.total_minor).toBe(550000);
    expect(() => s.order(b.id, o.id)).toThrow(/not found/);
    expect(
      s.createOrder(
        a.id,
        [{ productId: "dev-circle", quantity: 1 }],
        address,
        "one",
      ),
    ).toMatchObject({ id: o.id });
    expect((s.catalog()[0] as { stock: number }).stock).toBe(7);
  });
  it("stock reservation rolls back invalid orders and cancellation restores only once", () => {
    const s = setup(),
      u = s.createGuest();
    expect(() =>
      s.createOrder(
        u.id,
        [
          { productId: "dev-circle", quantity: 2 },
          { productId: "missing", quantity: 1 },
        ],
        address,
        "invalid",
      ),
    ).toThrow();
    expect((s.catalog()[0] as { stock: number }).stock).toBe(8);
    const o = s.createOrder(
      u.id,
      [{ productId: "dev-circle", quantity: 2 }],
      address,
      "valid",
    ) as { id: string };
    s.cancelOrder(u.id, o.id);
    s.cancelOrder(u.id, o.id);
    expect((s.catalog()[0] as { stock: number }).stock).toBe(8);
  });
  it("code redemption races grant once, duplicates free, revoked/expired unavailable", async () => {
    const s = setup(),
      a = s.createGuest(),
      b = s.createGuest();
    const issued = s.issueCode(
      "dev-circle-120-dark",
      2,
      Date.now() + 60000,
      "admin",
    );
    const results = await Promise.allSettled([
      Promise.resolve().then(() => s.redeemCode(a.id, issued.code)),
      Promise.resolve().then(() => s.redeemCode(b.id, issued.code)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(s.balance(a.id) + s.balance(b.id)).toBe(2);
    expect(s.redeemCode(a.id, issued.code)).toMatchObject({
      duplicate: true,
      balance: 2,
    });
    const revoked = s.issueCode("dev-circle", 1, Date.now() + 60000, "admin");
    s.revokeCode(revoked.code, "admin");
    expect(() => s.redeemCode(a.id, revoked.code)).toThrow();
  });
  it("forged, replayed, wrong-price, expired callbacks cannot grant twice", () => {
    const s = setup(),
      a = s.createGuest();
    const o = s.createOrder(
      a.id,
      [{ productId: "dev-circle", quantity: 1 }],
      address,
      "pay",
    ) as { id: string; total_minor: number };
    const raw = JSON.stringify({
      eventId: "evt1",
      orderId: o.id,
      amountMinor: o.total_minor,
      currency: "UZS",
      status: "paid",
      timestamp: Date.now(),
    });
    expect(() => s.payment(raw, "f".repeat(64))).toThrow(/signature/);
    const wrong = raw.replace("550000", "1");
    expect(() => s.payment(wrong, s.signSandbox(wrong))).toThrow(/mismatch/);
    expect(s.balance(a.id)).toBe(0);
    s.payment(raw, s.signSandbox(raw));
    s.payment(raw, s.signSandbox(raw));
    expect(s.balance(a.id)).toBe(1);
    const stale = JSON.stringify({
      eventId: "evt2",
      orderId: o.id,
      amountMinor: o.total_minor,
      currency: "UZS",
      status: "paid",
      timestamp: Date.now() - 600000,
    });
    expect(() => s.payment(stale, s.signSandbox(stale))).toThrow(/expired/);
    expect(s.recordSandboxMessages()).toMatchObject({ sent: false });
    expect(
      (s.db.prepare("SELECT state FROM messages").get() as { state: string })
        .state,
    ).toBe("sandbox_recorded");
  });
  it("failed generation refunds, same-request retry does not double charge, saved instructions re-download free", async () => {
    const s = setup(),
      a = s.createGuest(),
      b = s.createGuest();
    const code = s.issueCode("dev-circle", 2, Date.now() + 60000, "admin");
    s.redeemCode(a.id, code.code);
    const n = 32,
      i = await generate({
        pixels: new Uint8Array(n * n * 3).fill(90),
        resolution: n,
        profile: createProfile("circle", 48),
        lines: 40,
        mode: "dark",
      });
    const first = s.reserveGeneration(a.id, "request", i.sequenceHash);
    expect(s.balance(a.id)).toBe(1);
    expect(s.reserveGeneration(a.id, "request", i.sequenceHash)).toMatchObject({
      id: first.id,
    });
    expect(s.balance(a.id)).toBe(1);
    s.finishGeneration(a.id, first.id, null);
    s.finishGeneration(a.id, first.id, null);
    expect(s.balance(a.id)).toBe(2);
    const retry = s.reserveGeneration(a.id, "request", i.sequenceHash);
    s.finishGeneration(a.id, retry.id, i);
    s.finishGeneration(a.id, retry.id, i);
    expect(s.balance(a.id)).toBe(1);
    expect(s.instruction(a.id, i.id).sequenceHash).toBe(i.sequenceHash);
    expect(s.instruction(a.id, i.id).sequenceHash).toBe(i.sequenceHash);
    expect(s.balance(a.id)).toBe(1);
    expect(() => s.instruction(b.id, i.id)).toThrow();
    const progress = s.saveProgress(
      a.id,
      i.id,
      { ...progressFor(i), confirmed: 2 },
      0,
    );
    expect(() =>
      s.saveProgress(a.id, i.id, { ...progress, confirmed: 3 }, 0),
    ).toThrow(/conflict/);
  });
  it("expires abandoned reservations exactly once, and deduplicates the same sequence under new retry keys", () => {
    const s = setup(),
      u = s.createGuest(),
      code = s.issueCode("dev-circle", 2, Date.now() + 60000, "admin");
    s.redeemCode(u.id, code.code);
    const a = s.reserveGeneration(u.id, "first", "a".repeat(64));
    expect(
      s.reserveGeneration(u.id, "another-retry", "a".repeat(64)),
    ).toMatchObject({ id: a.id });
    expect(s.balance(u.id)).toBe(1);
    expect(s.expireReservations(Date.now() + 1)).toBe(1);
    expect(s.expireReservations(Date.now() + 1)).toBe(0);
    expect(s.balance(u.id)).toBe(2);
  });
});
