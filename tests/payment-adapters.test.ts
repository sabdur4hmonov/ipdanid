import { afterEach, expect, test } from "vitest";
import { KitStore } from "../server/kit-store";
import { Payments } from "../server/payments";
import {
  ClickAdapter,
  PaymeAdapter,
  clickSignature,
  sumToMinor,
  minorToSum,
} from "../server/payment-adapters";
const clickKey = "synthetic-click-secret-12345",
  paymeKey = "synthetic-payme-secret-12345",
  serviceId = "12345",
  login = "Paycom-test";
const auth = "Basic " + Buffer.from(login + ":" + paymeKey).toString("base64");
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  s.seed();
  stores.push(s);
  const user = s.createGuest().id,
    other = s.createGuest().id;
  const order = s.createOrder(
    user,
    [{ productId: "dev-circle", quantity: 1 }],
    { name: "Synthetic buyer", city: "Test city", street: "Test address" },
    crypto.randomUUID(),
  );
  const p = new Payments(s, {
    mode: "sandbox",
    click: { serviceId, secret: clickKey },
    payme: { login, secret: paymeKey },
  });
  return { s, p, user, other, order };
}
function click(
  orderId: string,
  amountMinor: number,
  action = 0,
  prepareId?: number,
  extra: Record<string, unknown> = {},
) {
  const body: Record<string, unknown> = {
    click_trans_id: "1001",
    service_id: serviceId,
    merchant_trans_id: orderId,
    amount: minorToSum(amountMinor),
    action: String(action),
    sign_time: "2026-10-17 10:00:00",
    error: "0",
    ...(prepareId ? { merchant_prepare_id: String(prepareId) } : {}),
    ...extra,
  };
  body.sign_string = clickSignature(body, clickKey);
  return body;
}
const rpc = (method: string, params: unknown) => ({ id: 1, method, params });

test("Click canonical MD5 vector and exact UZS/tiyin conversion reject tampering and rounding", () => {
  const adapter = new ClickAdapter(serviceId, clickKey),
    body = click("order-1", 12345);
  expect(body.sign_string === "2c1b76f02877c677e3a38bc9df1a2f63").toBe(true);
  expect(adapter.verify(body)).toMatchObject({
    operation: "prepare",
    amountMinor: 12345,
  });
  expect(() => adapter.verify({ ...body, amount: "123.46" })).toThrow(
    /Signature/,
  );
  expect(() => adapter.verify({ ...body, merchant_trans_id: "other" })).toThrow(
    /Signature/,
  );
  expect(() =>
    adapter.verify(
      click("order-1", 12345, 0, undefined, { service_id: "999" }),
    ),
  ).toThrow(/Service/);
  expect(() => adapter.verify(click("order-1", 12345, 9))).toThrow(/action/);
  for (const invalid of [
    "1.001",
    "1e2",
    "-1",
    "0",
    "NaN",
    "99999999999999999999999",
  ])
    expect(() => sumToMinor(invalid)).toThrow();
  expect(sumToMinor("123.4")).toBe(12340);
  expect(minorToSum(12340)).toBe("123.40");
});
test("Payme exact HTTP Basic and RPC whitelist reject wrong credentials, amount, id and inherited methods", () => {
  const adapter = new PaymeAdapter(login, paymeKey),
    body = rpc("CreateTransaction", {
      id: "t1",
      time: Date.now(),
      amount: 12345,
      account: { order_id: "order-1" },
    });
  expect(adapter.verify(body, auth)).toMatchObject({
    operation: "prepare",
    amountMinor: 12345,
  });
  expect(() => adapter.verify(body, "Basic wrong")).toThrow(/Authorization/);
  expect(() => adapter.verify(rpc("toString", {}), auth)).toThrow(/Method/);
  expect(() =>
    adapter.verify(
      rpc("CreateTransaction", {
        id: "t",
        time: 1,
        amount: 1.1,
        account: { order_id: "o" },
      }),
      auth,
    ),
  ).toThrow(/amount/);
  expect(() => adapter.verify({ ...body, id: {} }, auth)).toThrow(/RPC/);
});
test("invoice ownership, idempotency, frozen amount and one active provider per order", () => {
  const { s, p, user, other, order } = setup(),
    invoice = p.createInvoice(user, "click", order.id, "retry");
  expect(p.createInvoice(user, "click", order.id, "retry").id).toBe(invoice.id);
  expect(p.createInvoice(user, "click", order.id, "another").id).toBe(
    invoice.id,
  );
  expect(() =>
    p.createInvoice(user, "payme", order.id, "different-provider"),
  ).toThrow(/active/);
  expect(() => p.orderStatus(other, invoice.id)).toThrow(/not found/);
  expect(() => p.createInvoice(other, "click", order.id, "stolen")).toThrow(
    /not found/,
  );
  expect(p.orderStatus(user, invoice.id).amountMinor).toBe(order.total_minor);
  expect(s.balance(user)).toBe(0);
});
test("Click prepare/complete survives duplicates without a second credit and locks prepared stock", () => {
  const { s, p, user, order } = setup(),
    invoice = p.createInvoice(user, "click", order.id, "click");
  const prepared = p.callback(
    "click",
    click(order.id, order.total_minor),
  ) as any;
  expect(prepared.error).toBe(0);
  expect(prepared.merchant_prepare_id).toBeGreaterThan(0);
  expect(() => s.cancelOrder(user, order.id)).toThrow(/Prepared payment/);
  const wrong = p.callback(
    "click",
    click(order.id, order.total_minor + 1, 1, prepared.merchant_prepare_id),
  ) as any;
  expect(wrong.error).toBe(-2);
  expect(s.balance(user)).toBe(0);
  const completed = click(
    order.id,
    order.total_minor,
    1,
    prepared.merchant_prepare_id,
  );
  expect((p.callback("click", completed) as any).error).toBe(0);
  expect((p.callback("click", completed) as any).error).toBe(0);
  expect(s.balance(user)).toBe(1);
  expect(s.order(user, order.id).status).toBe("paid");
  expect(p.orderStatus(user, invoice.id).status).toBe("paid");
  expect(
    Number(s.db.prepare("SELECT count(*) AS n FROM payments").get()!.n),
  ).toBe(1);
});
test("Click cancelled transaction restores stock once and cannot later complete", () => {
  const { s, p, user, order } = setup(),
    invoice = p.createInvoice(user, "click", order.id, "cancel");
  const prepared = p.callback(
    "click",
    click(order.id, order.total_minor),
  ) as any;
  const cancel = click(
    order.id,
    order.total_minor,
    1,
    prepared.merchant_prepare_id,
    { error: "-501" },
  );
  expect((p.callback("click", cancel) as any).error).toBe(-9);
  expect((p.callback("click", cancel) as any).error).toBe(-9);
  expect(
    (
      p.callback(
        "click",
        click(order.id, order.total_minor, 1, prepared.merchant_prepare_id),
      ) as any
    ).error,
  ).toBe(-9);
  expect(s.balance(user)).toBe(0);
  expect(s.order(user, order.id).status).toBe("cancelled");
  expect(s.catalog()[0].stock).toBe(8);
  expect(p.orderStatus(user, invoice.id).state).toBe(-1);
});
test("Payme check/create/perform/status/statement are persistent, idempotent and amount-bound", () => {
  const { s, p, user, order } = setup(),
    invoice = p.createInvoice(user, "payme", order.id, "payme"),
    now = Date.now(),
    params = {
      id: "payme-1",
      time: now,
      amount: order.total_minor,
      account: { order_id: order.id },
    };
  expect(
    (p.callback("payme", rpc("CheckPerformTransaction", params), auth) as any)
      .result.allow,
  ).toBe(true);
  const first = p.callback(
    "payme",
    rpc("CreateTransaction", params),
    auth,
  ) as any;
  expect(first.result.state).toBe(1);
  expect(
    (p.callback("payme", rpc("CreateTransaction", params), auth) as any).result,
  ).toEqual(first.result);
  expect(
    (
      p.callback(
        "payme",
        rpc("CreateTransaction", { ...params, time: now + 1 }),
        auth,
      ) as any
    ).error.code,
  ).toBe(-31008);
  const performed = p.callback(
    "payme",
    rpc("PerformTransaction", { id: params.id }),
    auth,
  ) as any;
  expect(performed.result.state).toBe(2);
  expect(
    (
      p.callback(
        "payme",
        rpc("PerformTransaction", { id: params.id }),
        auth,
      ) as any
    ).result.perform_time,
  ).toBe(performed.result.perform_time);
  expect(s.balance(user)).toBe(1);
  expect(p.orderStatus(user, invoice.id).status).toBe("paid");
  const restarted = new Payments(s, {
    mode: "sandbox",
    payme: { login, secret: paymeKey },
  });
  expect(
    (
      restarted.callback(
        "payme",
        rpc("CheckTransaction", { id: params.id }),
        auth,
      ) as any
    ).result.state,
  ).toBe(2);
  const statement = restarted.callback(
    "payme",
    rpc("GetStatement", { from: now, to: now }),
    auth,
  ) as any;
  expect(statement.result.transactions).toHaveLength(1);
  expect(statement.result.transactions[0].amount).toBe(order.total_minor);
  expect(
    (
      p.callback(
        "payme",
        rpc("CancelTransaction", { id: params.id, reason: 1 }),
        auth,
      ) as any
    ).error.code,
  ).toBe(-31007);
  expect(s.balance(user)).toBe(1);
  expect(
    (
      p.callback(
        "payme",
        rpc("CheckTransaction", { id: "unknown" }),
        auth,
      ) as any
    ).error.code,
  ).toBe(-31003);
});
test("Payme12hour timeout cancels prepared stock without granting credits; retries stay cancelled", () => {
  const { s, p, user, order } = setup(),
    invoice = p.createInvoice(user, "payme", order.id, "timeout"),
    now = Date.now(),
    id = "payme-timeout";
  p.callback(
    "payme",
    rpc("CreateTransaction", {
      id,
      time: now,
      amount: order.total_minor,
      account: { order_id: order.id },
    }),
    auth,
    now,
  );
  expect(
    (
      p.callback(
        "payme",
        rpc("PerformTransaction", { id }),
        auth,
        now + 43200001,
      ) as any
    ).error.code,
  ).toBe(-31008);
  const status = p.callback(
    "payme",
    rpc("CheckTransaction", { id }),
    auth,
  ) as any;
  expect(status.result.state).toBe(-1);
  expect(status.result.reason).toBe(4);
  expect(p.orderStatus(user, invoice.id).status).toBe("cancelled");
  expect(s.balance(user)).toBe(0);
  expect(s.catalog()[0].stock).toBe(8);
});
test("settlement failure rolls invoice, order and credits back in the same SQLite transaction", () => {
  const { s, p, user, order } = setup();
  p.createInvoice(user, "click", order.id, "atomic");
  const prepared = p.callback(
    "click",
    click(order.id, order.total_minor),
  ) as any;
  const raw = JSON.stringify({
    eventId: "atomic-test",
    orderId: order.id,
    amountMinor: order.total_minor,
    currency: "UZS",
    status: "paid",
    timestamp: Date.now(),
  });
  expect(() =>
    s.payment(raw, s.signSandbox(raw), () => {
      throw Error("injected transaction failure");
    }),
  ).toThrow(/injected/);
  expect(s.order(user, order.id).status).toBe("pending");
  expect(s.balance(user)).toBe(0);
  expect(
    s.db.prepare("SELECT 1 FROM payments WHERE event_id='atomic-test'").get(),
  ).toBeUndefined();
  expect(
    (
      p.callback(
        "click",
        click(order.id, order.total_minor, 1, prepared.merchant_prepare_id),
      ) as any
    ).error,
  ).toBe(0);
  expect(s.balance(user)).toBe(1);
});

test("sandbox mock checkout is opt-in, owner-bound and idempotent; changing unstarted invoices grants no credits", () => {
  const { s, p, user, other, order } = setup();
  const invoice = p.createInvoice(user, "click", order.id, "mock");
  expect(() => p.simulate(user, invoice.id)).toThrow(/unavailable/);
  const enabled = new Payments(s, {
    mode: "sandbox",
    mockCheckout: true,
    click: { serviceId, secret: clickKey },
    payme: { login, secret: paymeKey },
  });
  expect(() => enabled.simulate(other, invoice.id)).toThrow(/not found/);
  expect(enabled.cancelInvoice(user, invoice.id).state).toBe(-1);
  const next = enabled.createInvoice(user, "payme", order.id, "changed");
  expect(s.balance(user)).toBe(0);
  expect(enabled.simulate(user, next.id).state).toBe(2);
  expect(enabled.simulate(user, next.id).state).toBe(2);
  expect(s.balance(user)).toBe(1);
  expect(() => enabled.cancelInvoice(user, next.id)).toThrow(/unstarted/);
});

test("provider cancellation after customer cancels an unstarted order records invoice without a second stock return", () => {
  const { s, p, user, order } = setup();
  p.createInvoice(user, "click", order.id, "cancel-first");
  s.cancelOrder(user, order.id);
  const stock = s.catalog()[0].stock;
  const result = p.callback(
    "click",
    click(order.id, order.total_minor, 0, undefined, { error: "-1" }),
  ) as any;
  expect(result.error).toBe(-9);
  expect(
    s.db
      .prepare("SELECT state FROM payment_invoices WHERE order_id=?")
      .get(order.id)?.state,
  ).toBe(-1);
  expect(s.catalog()[0].stock).toBe(stock);
});
