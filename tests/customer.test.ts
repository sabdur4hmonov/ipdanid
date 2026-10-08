import { afterEach, describe, expect, it } from "vitest";
import { CustomerStore } from "../server/customer-store";
import { createProfile } from "../src/core/geometry";
import { generate } from "../src/core/engine";
import { progressFor } from "../src/core/validation";

const stores: CustomerStore[] = [];
function setup() {
  const store = new CustomerStore(":memory:", "p".repeat(32), "k".repeat(32));
  store.seed();
  stores.push(store);
  return store;
}
afterEach(() => stores.splice(0).forEach((store) => store.close()));
const address = {
  name: "Test Maker",
  city: "Tashkent",
  street: "Development street",
};
const items = [{ productId: "dev-circle", quantity: 1 }];
const password = "a private test password";
function credit(s: CustomerStore, user: string, n = 2) {
  const code = s.issueCode(
    "dev-circle-120-dark",
    n,
    Date.now() + 60000,
    "admin",
  );
  s.redeemCode(user, code.code);
}
describe("customer account and administration outcomes", () => {
  it("registration retains guest credits and ownership, revokes guest tokens, and stores only derived secrets", () => {
    const s = setup(),
      guest = s.createGuest();
    credit(s, guest.id);
    const order = s.createOrder(
      guest.id,
      items,
      address,
      "before-registration",
    );
    const a = s.register(guest.id, " Test@Example.com ", password);
    expect(a.id).toBe(guest.id);
    expect(s.customer(a.id)).toMatchObject({
      email: "test@example.com",
      credits: 2,
    });
    expect(s.orders(a.id)[0].id).toBe(order.id);
    expect(() => s.authenticate(guest.token)).toThrow();
    expect(s.authenticate(a.token)).toBe(a.id);
    const stored = JSON.stringify(s.db.prepare("SELECT * FROM accounts").get());
    expect(stored).not.toContain(password);
    expect(stored).not.toContain(a.recoveryKey);
    expect(() =>
      s.register(s.createGuest().id, "TEST@example.com", password),
    ).toThrow(/exists/);
    expect(s.login("test@example.com", password).id).toBe(a.id);
    expect(() =>
      s.login("test@example.com", "wrong password long enough"),
    ).toThrow(/incorrect/);
  });
  it("recovery rotates one-time keys and revokes all existing sessions without changing customer data", () => {
    const s = setup(),
      a = s.register(s.createGuest().id, "recovery@example.com", password),
      second = s.login(a.email, password);
    credit(s, a.id);
    expect(() => s.recover(a.email, "forged", password)).toThrow();
    const b = s.recover(a.email, a.recoveryKey, "my replacement password");
    expect(b.recoveryKey).not.toBe(a.recoveryKey);
    expect(s.balance(b.id)).toBe(2);
    expect(() => s.authenticate(a.token)).toThrow();
    expect(() => s.authenticate(second.token)).toThrow();
    expect(() => s.recover(a.email, a.recoveryKey, password)).toThrow();
    expect(() => s.login(a.email, password)).toThrow();
    expect(s.login(a.email, "my replacement password").id).toBe(a.id);
    s.logout(b.token);
    expect(() => s.authenticate(b.token)).toThrow();
  });
  it("order retries ignore field ordering but reject changed payload without additional stock loss", () => {
    const s = setup(),
      a = s.createGuest(),
      o = s.createOrder(a.id, items, address, "retry");
    expect(
      s.createOrder(
        a.id,
        [{ quantity: 1, productId: "dev-circle" }],
        { street: address.street, city: address.city, name: address.name },
        "retry",
      ).id,
    ).toBe(o.id);
    expect(() =>
      s.createOrder(
        a.id,
        [{ productId: "dev-circle", quantity: 2 }],
        address,
        "retry",
      ),
    ).toThrow(/differ/);
    expect(() =>
      s.createOrder(
        a.id,
        items,
        { ...address, street: "Changed address" },
        "retry",
      ),
    ).toThrow(/differ/);
    expect(s.catalog()[0].stock).toBe(7);
    expect(() =>
      s.createOrder(a.id, items, {} as typeof address, "bad"),
    ).toThrow();
  });
  it("catalog edits cannot overwrite intervening stock reservations or another admin edit", () => {
    const s = setup(),
      a = s.createGuest(),
      p = s.products()[0];
    s.createOrder(a.id, items, address, "stock");
    expect(() =>
      s.updateProduct("admin", { ...p, expectedRevision: p.revision }),
    ).toThrow(/changed/);
    const latest = s.products()[0];
    const edited = s.updateProduct("admin", {
      ...latest,
      name: "Edited test kit",
      expectedRevision: latest.revision,
    })!;
    expect(edited.stock).toBe(7);
    expect(() =>
      s.updateProduct("admin", {
        ...latest,
        expectedRevision: latest.revision,
      }),
    ).toThrow(/changed/);
    expect(s.auditHistory().some((r) => r.action === "product.update")).toBe(
      true,
    );
  });
  it("test payment, shipment, return and refund conserve credits and stock exactly once", () => {
    const s = setup(),
      a = s.createGuest(),
      b = s.createGuest(),
      o = s.createOrder(a.id, items, address, "lifecycle");
    expect(() => s.fulfill("admin", o.id, "TEST-TRACK")).toThrow();
    s.recordTestPayment(o.id);
    s.recordTestPayment(o.id);
    expect(s.balance(a.id)).toBe(1);
    s.fulfill("admin", o.id, "TEST-TRACK");
    expect(s.orders(a.id)[0].fulfillments[0]).toMatchObject({
      tracking: "TEST-TRACK",
      state: "recorded",
    });
    expect(() => s.requestReturn(b.id, o.id)).toThrow(/not found/);
    s.requestReturn(a.id, o.id);
    s.requestReturn(a.id, o.id);
    s.refund("admin", o.id);
    s.refund("admin", o.id);
    expect(s.balance(a.id)).toBe(0);
    expect(s.catalog()[0].stock).toBe(8);
    expect(s.orders(a.id)[0].status).toBe("refunded");
    expect(() => s.recordTestPayment(o.id)).toThrow();
  });
  it("spent order credits block a refund atomically until manual resolution", () => {
    const s = setup(),
      a = s.createGuest(),
      o = s.createOrder(a.id, items, address, "spent");
    s.recordTestPayment(o.id);
    s.createGift(a.id, 1, Date.now() + 60000, "gift");
    s.requestReturn(a.id, o.id);
    expect(() => s.refund("admin", o.id)).toThrow(/spent/);
    expect(s.orders(a.id)[0].status).toBe("return_requested");
    expect(s.catalog()[0].stock).toBe(7);
    expect(s.balance(a.id)).toBe(0);
  });
  it("support lists isolate owners, retain replies and never expose administrator identity", () => {
    const s = setup(),
      a = s.createGuest(),
      b = s.createGuest();
    const ticket = s.ticket(a.id, "Need help", "Test support message", null);
    s.reply(
      "private-admin-identity",
      String(ticket.id),
      "Exact local reply",
      "answered",
    );
    expect(s.tickets(b.id)).toEqual([]);
    expect(s.tickets(a.id)[0]).toMatchObject({
      state: "answered",
      replies: [{ body: "Exact local reply" }],
    });
    expect(JSON.stringify(s.tickets(a.id))).not.toContain(
      "private-admin-identity",
    );
    expect(() => s.reply("admin", "missing", "Reply", "closed")).toThrow();
  });
  it("identical immutable instructions can be owned independently and progress uses explicit revision checks", async () => {
    const s = setup(),
      a = s.createGuest(),
      b = s.createGuest();
    credit(s, a.id);
    credit(s, b.id);
    const instruction = await generate({
      pixels: new Uint8Array(32 * 32 * 3).fill(90),
      resolution: 32,
      profile: createProfile("circle", 48),
      lines: 40,
      mode: "dark",
    });
    const jobA = s.reserveGeneration(a.id, "save", instruction.sequenceHash),
      jobB = s.reserveGeneration(b.id, "save", instruction.sequenceHash);
    s.finishGeneration(a.id, jobA.id, instruction);
    s.finishGeneration(b.id, jobB.id, instruction);
    const idA = String(s.instructions(a.id)[0].id),
      idB = String(s.instructions(b.id)[0].id);
    expect(idA).not.toBe(idB);
    expect(s.instruction(b.id, idB).sequenceHash).toBe(
      instruction.sequenceHash,
    );
    expect(() => s.instruction(b.id, idA)).toThrow();
    expect(() => s.progress(b.id, idA)).toThrow();
    const saved = s.saveProgress(
      a.id,
      idA,
      { ...progressFor(instruction), confirmed: 4 },
      0,
    );
    expect(s.progress(a.id, idA)).toEqual(saved);
    expect(s.progress(b.id, idB).confirmed).toBe(0);
    expect(() =>
      s.saveProgress(a.id, idA, { ...saved, confirmed: 5 }, 0),
    ).toThrow(/conflict/);
    expect(() => s.saveProgress(a.id, idA, saved, -1)).toThrow();
    expect(s.balance(a.id)).toBe(1);
    expect(s.balance(b.id)).toBe(1);
  });
});
