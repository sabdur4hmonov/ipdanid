import { afterEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { KitStore } from "../server/kit-store";
import { FinanceStore } from "../server/finance-store";
import { Payments } from "../server/payments";
import { JourneyStore } from "../server/journey-store";
import { BusinessStore } from "../server/business-store";
import { AdminAccess, adminRoutePermission } from "../server/admin-access";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  s.seed();
  stores.push(s);
  const p = new Payments(s, {
      mode: "sandbox",
      mockCheckout: true,
      click: { serviceId: "12345", secret: "synthetic-click-key" },
      payme: { login: "Paycom-test", secret: "synthetic-payme-key" },
    }),
    f = new FinanceStore(s),
    user = s.createGuest().id,
    order = s.createOrder(
      user,
      [{ productId: "dev-circle", quantity: 1 }],
      {
        name: "Synthetic buyer",
        city: "Original city",
        street: "Original address",
      },
      randomUUID(),
    );
  const body = {
    requestKey: randomUUID(),
    received: true as const,
    amountMinor: order.total_minor,
    currency: "UZS" as const,
    reference: "SYNTHETIC-CASH-1",
  };
  return { s, p, f, user, order, body };
}
it("exact acknowledged manual receipt grants the original credits once and preserves immutable replay and provenance", () => {
  const x = setup(),
    balance = x.s.balance(x.user),
    before = x.s
      .orders(x.user)[0]
      .items.reduce((n, i) => n + Number(i.credits) * Number(i.quantity), 0);
  const result = x.f.receipt("finance", x.order.id, x.body);
  expect(result).toMatchObject({
    duplicate: false,
    bankVerified: false,
    source: "manual",
    order: { status: "paid" },
  });
  expect(x.s.balance(x.user)).toBe(balance + before);
  expect(x.f.receipt("another-finance", x.order.id, x.body).duplicate).toBe(
    true,
  );
  expect(x.s.balance(x.user)).toBe(balance + before);
  expect(() =>
    x.f.receipt("finance", x.order.id, { ...x.body, amountMinor: 1 }),
  ).toThrow(/retry differs/);
  expect(
    x.s.db
      .prepare("SELECT provider FROM payments WHERE order_id=?")
      .get(x.order.id)?.provider,
  ).toBe("manual");
  expect(
    x.f.reconciliation().orders.find((o) => o.id === x.order.id),
  ).toMatchObject({ settlement: "manual", settlementCount: 1, problems: [] });
});
it("wrong amount, currency, acknowledgement, reference and unknown fields fail before stock or ledger effects", () => {
  const x = setup();
  for (const change of [
    { amountMinor: 1 },
    { currency: "USD" },
    { received: false },
    { reference: "x" },
    { extra: "not accepted" },
    { amountMinor: NaN },
  ])
    expect(() =>
      x.f.receipt("finance", x.order.id, { ...x.body, ...change }),
    ).toThrow();
  expect(x.s.order(x.user, x.order.id).status).toBe("pending");
  expect(x.s.balance(x.user)).toBe(0);
  expect(
    x.s.db.prepare("SELECT COUNT(*) n FROM manual_receipts").get()?.n,
  ).toBe(0);
});
it("unstarted invoice is closed atomically before cash; a late mock provider cannot settle a second time", () => {
  const x = setup(),
    invoice = x.p.createInvoice(x.user, "click", x.order.id, randomUUID());
  x.f.receipt("finance", x.order.id, x.body);
  expect(x.p.orderStatus(x.user, invoice.id).state).toBe(-1);
  expect(() => x.p.simulate(x.user, invoice.id)).toThrow(/failed/);
  expect(
    x.s.db
      .prepare("SELECT COUNT(*) n FROM payments WHERE order_id=?")
      .get(x.order.id)?.n,
  ).toBe(1);
});
it("prepared provider transaction must resolve before recording a manual receipt", () => {
  const x = setup(),
    invoice = x.p.createInvoice(x.user, "payme", x.order.id, randomUUID()),
    transaction = randomUUID();
  const response = x.p.callback(
    "payme",
    {
      id: 1,
      method: "CreateTransaction",
      params: {
        id: transaction,
        time: Date.now(),
        amount: x.order.total_minor,
        account: { order_id: x.order.id },
      },
    },
    "Basic " +
      Buffer.from("Paycom-test:synthetic-payme-key").toString("base64"),
  ) as { error?: unknown };
  expect(response.error).toBeUndefined();
  expect(x.p.orderStatus(x.user, invoice.id).state).toBe(1);
  expect(() => x.f.receipt("finance", x.order.id, x.body)).toThrow(/Resolve/);
  expect(x.s.order(x.user, x.order.id).status).toBe("pending");
  expect(x.s.balance(x.user)).toBe(0);
});
it("paid provider order refuses cash; exact manual refund needs prior receipt and customer return request", () => {
  const x = setup(),
    invoice = x.p.createInvoice(x.user, "click", x.order.id, randomUUID());
  x.p.simulate(x.user, invoice.id);
  expect(() => x.f.receipt("finance", x.order.id, x.body)).toThrow(
    /state changed/,
  );
  const y = setup(),
    refund = {
      requestKey: randomUUID(),
      returned: true,
      amountMinor: y.body.amountMinor,
      currency: y.body.currency,
      reference: "SYNTHETIC-RETURN-1",
    };
  expect(() => y.f.refund("finance", y.order.id, refund)).toThrow(/receipt/);
  y.f.receipt("finance", y.order.id, y.body);
  expect(() => y.f.refund("finance", y.order.id, refund)).toThrow(
    /return request/,
  );
  y.s.requestReturn(y.user, y.order.id);
  expect(y.f.refund("finance", y.order.id, refund)).toMatchObject({
    duplicate: false,
    bankVerified: false,
    order: { status: "refunded" },
  });
  expect(y.f.refund("finance", y.order.id, refund).duplicate).toBe(true);
  expect(y.s.balance(y.user)).toBe(0);
  expect(() =>
    y.f.refund("finance", y.order.id, { ...refund, reference: "different" }),
  ).toThrow(/retry/);
});
it("gift finalization failure rolls back manual receipt, invoice closure, payment, order and escrow", () => {
  const x = setup(),
    j = new JourneyStore(x.s),
    b = new BusinessStore(x.s);
  x.s.db.prepare("UPDATE users SET role='maker' WHERE id=?").run(x.user);
  x.s.updateProduct("owner", {
    id: "receipt-gift",
    name: "Original gift",
    family: "digital",
    price_minor: 10000,
    currency: "UZS",
    stock: 3,
    credits: 3,
    description: "",
    expectedRevision: 0,
    active: 1,
    profile_id: "board",
  });
  j.save("owner", {
    version: "journey-product/1",
    productId: "receipt-gift",
    enabled: true,
    kind: "gift",
    revision: 0,
  });
  const product = x.s.products().find((p) => p.id === "receipt-gift")!,
    gift = j.purchase(x.user, {
      productId: "receipt-gift",
      kind: "gift",
      name: "Synthetic Gift",
      locale: "en",
      requestKey: randomUUID(),
      quote: {
        productRevision: product.revision,
        settingsRevision: b.settings().revision,
        currency: "UZS",
        totalMinor: 10000,
      },
    }),
    invoice = x.p.createInvoice(x.user, "click", gift.orderId, randomUUID());
  x.s.db.exec(
    "CREATE TRIGGER fail_manual_gift BEFORE INSERT ON gifts BEGIN SELECT RAISE(ABORT,'injected gift failure'); END",
  );
  expect(() =>
    x.f.receipt("finance", gift.orderId, { ...x.body, amountMinor: 10000 }),
  ).toThrow(/injected/);
  expect(x.p.orderStatus(x.user, invoice.id).state).toBe(0);
  expect(x.s.order(x.user, gift.orderId).status).toBe("pending");
  expect(
    x.s.db
      .prepare("SELECT COUNT(*) n FROM payments WHERE order_id=?")
      .get(gift.orderId)?.n,
  ).toBe(0);
  expect(
    x.s.db
      .prepare("SELECT COUNT(*) n FROM manual_receipts WHERE order_id=?")
      .get(gift.orderId)?.n,
  ).toBe(0);
  expect(x.s.balance(x.user)).toBe(0);
});
it("staff statement comparison records discrepancies without charging, granting or changing invoice states", () => {
  const x = setup(),
    invoice = x.p.createInvoice(x.user, "click", x.order.id, randomUUID()),
    row = {
      invoiceId: invoice.id,
      provider: "click",
      currency: "UZS",
      amountMinor: x.order.total_minor,
      state: 0,
    };
  const matched = x.f.compare("finance", { rows: [row] });
  expect(matched).toMatchObject({
    bankVerified: false,
    results: [{ result: "matches" }],
  });
  expect(
    x.f.compare("finance", { rows: [{ ...row, state: 2 }] }).results[0].result,
  ).toBe("state-mismatch");
  expect(
    x.f.compare("finance", { rows: [{ ...row, amountMinor: 1 }] }).results[0]
      .result,
  ).toBe("amount-mismatch");
  expect(
    x.f.compare("finance", { rows: [{ ...row, invoiceId: randomUUID() }] })
      .results[0].result,
  ).toBe("missing-local");
  expect(() => x.f.compare("finance", { rows: [row, row] })).toThrow(
    /duplicate/,
  );
  expect(x.p.orderStatus(x.user, invoice.id).state).toBe(0);
  expect(x.s.balance(x.user)).toBe(0);
  expect(x.f.reconciliation().comparisons).toHaveLength(4);
});
it("finance routes require Finance, and local anomalies are flagged rather than automatically paid or refunded", () => {
  const x = setup(),
    a = new AdminAccess(x.s, "root".repeat(10)),
    staff = a.issue("root".repeat(10), {
      name: "Support",
      role: "support",
      days: 1,
    });
  for (const [method, path] of [
    ["GET", "/api/admin/finance/reconciliation"],
    ["POST", "/api/admin/finance/statement"],
    ["POST", "/api/admin/finance/orders/" + x.order.id + "/receipt"],
    ["POST", "/api/admin/finance/orders/" + x.order.id + "/refund"],
  ])
    expect(adminRoutePermission(method, path)).toBe("finance");
  expect(() => a.require(staff.token, "finance")).toThrow(/cannot/);
  x.s.db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(x.order.id);
  expect(
    x.f.reconciliation().orders.find((o) => o.id === x.order.id)?.problems,
  ).toContain("missing-local-settlement");
  expect(x.s.balance(x.user)).toBe(0);
});
