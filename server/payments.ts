import { randomUUID } from "node:crypto";
import type { KitStore } from "./kit-store";
import { DomainError } from "./store";
import {
  ClickAdapter,
  PaymeAdapter,
  ProviderError,
  minorToSum,
  clickSignature,
  type PaymentAdapter,
  type PaymentProvider,
  type VerifiedPayment,
} from "./payment-adapters";

type Invoice = {
  id: number;
  public_id: string;
  owner_id: string;
  order_id: string;
  provider: PaymentProvider;
  amount_minor: number;
  request_key: string;
  state: number;
  transaction_id: string | null;
  created_at: number;
  provider_time: number;
  prepare_time: number;
  perform_time: number;
  cancel_time: number;
  reason: number | null;
};
export interface PaymentConfiguration {
  mode: "disabled" | "sandbox";
  mockCheckout?: boolean;
  click?: { serviceId: string; secret: string };
  payme?: { login: string; secret: string };
}
export class Payments {
  private adapters = new Map<PaymentProvider, PaymentAdapter>();
  constructor(
    private store: KitStore,
    private config: PaymentConfiguration,
  ) {
    if (config.mode === "sandbox") {
      if (config.click)
        this.adapters.set(
          "click",
          new ClickAdapter(config.click.serviceId, config.click.secret),
        );
      if (config.payme)
        this.adapters.set(
          "payme",
          new PaymeAdapter(config.payme.login, config.payme.secret),
        );
    }
    store.db.exec(`CREATE TABLE IF NOT EXISTS payment_invoices(
      id INTEGER PRIMARY KEY AUTOINCREMENT,public_id TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL,order_id TEXT NOT NULL REFERENCES orders(id),provider TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,request_key TEXT NOT NULL,state INTEGER NOT NULL DEFAULT 0,
      transaction_id TEXT,created_at INTEGER NOT NULL,provider_time INTEGER NOT NULL DEFAULT 0,prepare_time INTEGER NOT NULL DEFAULT 0,
      perform_time INTEGER NOT NULL DEFAULT 0,cancel_time INTEGER NOT NULL DEFAULT 0,reason INTEGER,
      UNIQUE(owner_id,provider,request_key),UNIQUE(provider,transaction_id));
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_payment_per_order ON payment_invoices(order_id) WHERE state IN(0,1,2);
      CREATE TRIGGER IF NOT EXISTS prepared_payment_reserves_order BEFORE UPDATE OF status ON orders
      WHEN NEW.status='cancelled' AND EXISTS(SELECT 1 FROM payment_invoices WHERE order_id=OLD.id AND state=1)
      BEGIN SELECT RAISE(ABORT,'Prepared payment must be cancelled by its provider'); END;`);
    if (
      !store.db
        .prepare("PRAGMA table_info(payment_invoices)")
        .all()
        .some((row) => row.name === "prepare_time")
    )
      store.db.exec(
        "ALTER TABLE payment_invoices ADD COLUMN prepare_time INTEGER NOT NULL DEFAULT 0;UPDATE payment_invoices SET prepare_time=provider_time",
      );
  }
  availability() {
    return {
      mode: this.config.mode,
      providers: [...this.adapters.keys()],
      realCharges: false,
      mockCheckout:
        this.config.mode === "sandbox" && this.config.mockCheckout === true,
    };
  }
  private transaction<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.store.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  private active(order: string, provider: PaymentProvider) {
    return this.store.db
      .prepare(
        "SELECT * FROM payment_invoices WHERE order_id=? AND provider=? ORDER BY id DESC LIMIT 1",
      )
      .get(order, provider) as Invoice | undefined;
  }
  private byTransaction(provider: PaymentProvider, id: string) {
    return this.store.db
      .prepare(
        "SELECT * FROM payment_invoices WHERE provider=? AND transaction_id=?",
      )
      .get(provider, id) as Invoice | undefined;
  }
  private publicInvoice(row: Invoice) {
    return {
      id: row.public_id,
      provider: row.provider,
      orderId: row.order_id,
      amountMinor: row.amount_minor,
      currency: "UZS",
      state: row.state,
      status:
        row.state === 2
          ? "paid"
          : row.state < 0
            ? "cancelled"
            : row.state === 1
              ? "prepared"
              : "created",
      sandbox: true,
    };
  }
  createInvoice(
    user: string,
    provider: PaymentProvider,
    orderId: unknown,
    requestKey: unknown,
  ) {
    if (!this.adapters.has(provider))
      throw new DomainError("Payment provider unavailable", 503);
    if (
      typeof orderId !== "string" ||
      typeof requestKey !== "string" ||
      !requestKey ||
      requestKey.length > 100
    )
      throw new DomainError("Invalid invoice request");
    return this.transaction(() => {
      const order = this.store.order(user, orderId);
      if (order.currency !== "UZS")
        throw new DomainError(
          "Click and Payme require UZS; no currency conversion",
          409,
        );
      const existing = this.store.db
        .prepare(
          "SELECT * FROM payment_invoices WHERE owner_id=? AND provider=? AND request_key=?",
        )
        .get(user, provider, requestKey) as Invoice | undefined;
      if (existing) {
        if (
          existing.order_id !== orderId ||
          existing.amount_minor !== order.total_minor
        )
          throw new DomainError("Invoice retry changed", 409);
        return this.publicInvoice(existing);
      }
      const active = this.store.db
        .prepare(
          "SELECT * FROM payment_invoices WHERE order_id=? AND state IN(0,1,2)",
        )
        .get(orderId) as Invoice | undefined;
      if (active) {
        if (active.provider !== provider)
          throw new DomainError("Another payment is already active", 409);
        return this.publicInvoice(active);
      }
      if (order.status !== "pending" || order.total_minor <= 0)
        throw new DomainError("Order cannot be paid", 409);
      this.store.db
        .prepare(
          "INSERT INTO payment_invoices(public_id,owner_id,order_id,provider,amount_minor,request_key,created_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          randomUUID(),
          user,
          orderId,
          provider,
          order.total_minor,
          requestKey,
          Date.now(),
        );
      return this.publicInvoice(this.active(orderId, provider)!);
    });
  }
  orderStatus(user: string, publicId: string) {
    const row = this.store.db
      .prepare(
        "SELECT * FROM payment_invoices WHERE public_id=? AND owner_id=?",
      )
      .get(publicId, user) as Invoice | undefined;
    if (!row) throw new DomainError("Invoice not found", 404);
    return this.publicInvoice(row);
  }
  cancelInvoice(user: string, publicId: string) {
    this.orderStatus(user, publicId);
    const row = this.store.db
      .prepare("SELECT * FROM payment_invoices WHERE public_id=?")
      .get(publicId) as Invoice;
    if (row.state !== 0)
      throw new DomainError("Only an unstarted invoice can be changed", 409);
    this.store.db
      .prepare(
        "UPDATE payment_invoices SET state=-1,cancel_time=?,reason=1 WHERE id=? AND state=0",
      )
      .run(Date.now(), row.id);
    return this.orderStatus(user, publicId);
  }
  simulate(user: string, publicId: string) {
    if (this.config.mode !== "sandbox" || !this.config.mockCheckout)
      throw new DomainError("Mock checkout unavailable", 403);
    this.orderStatus(user, publicId);
    const row = this.store.db
      .prepare("SELECT * FROM payment_invoices WHERE public_id=?")
      .get(publicId) as Invoice;
    if (row.state === 2) return this.orderStatus(user, publicId);
    const now = Date.now(),
      transaction = row.transaction_id ?? String(now) + String(row.id);
    const call = (body: Record<string, unknown>, authorization = "") => {
      const reply = this.callback(row.provider, body, authorization) as {
        error?: unknown;
      };
      if (reply.error && reply.error !== 0)
        throw new DomainError("Mock payment failed", 409);
      return reply;
    };
    if (row.provider === "click") {
      const body: Record<string, unknown> = {
        click_trans_id: transaction,
        service_id: this.config.click!.serviceId,
        merchant_trans_id: row.order_id,
        amount: minorToSum(row.amount_minor),
        action: "0",
        sign_time: new Date(now).toISOString().slice(0, 19).replace("T", " "),
        error: "0",
      };
      body.sign_string = clickSignature(body, this.config.click!.secret);
      call(body);
      body.action = "1";
      body.merchant_prepare_id = String(row.id);
      body.sign_string = clickSignature(body, this.config.click!.secret);
      call(body);
    } else {
      const authorization =
        "Basic " +
        Buffer.from(
          this.config.payme!.login + ":" + this.config.payme!.secret,
        ).toString("base64");
      call(
        {
          id: 1,
          method: "CreateTransaction",
          params: {
            id: transaction,
            time: row.provider_time || now,
            amount: row.amount_minor,
            account: { order_id: row.order_id },
          },
        },
        authorization,
      );
      call(
        { id: 2, method: "PerformTransaction", params: { id: transaction } },
        authorization,
      );
    }
    return this.orderStatus(user, publicId);
  }
  private summary(row: Invoice) {
    return {
      transaction: String(row.id),
      create_time: row.prepare_time,
      perform_time: row.perform_time,
      cancel_time: row.cancel_time,
      state: row.state,
      reason: row.reason,
    };
  }
  private checked(v: VerifiedPayment) {
    const row = v.orderId
      ? this.active(v.orderId, v.provider)
      : this.byTransaction(v.provider, v.transactionId);
    if (!row)
      throw new ProviderError(
        v.provider === "click" ? -5 : v.orderId ? -31050 : -31003,
        "Order not found",
        v.orderId ? "order_id" : undefined,
      );
    if (v.orderId && row.order_id !== v.orderId)
      throw new ProviderError(-31050, "Order mismatch", "order_id");
    if (v.amountMinor !== undefined && row.amount_minor !== v.amountMinor)
      throw new ProviderError(
        v.provider === "click" ? -2 : -31001,
        "Incorrect amount",
      );
    if (v.prepareId !== undefined && row.id !== v.prepareId)
      throw new ProviderError(-6, "Transaction not found");
    if (
      row.transaction_id &&
      v.transactionId &&
      row.transaction_id !== v.transactionId
    )
      throw new ProviderError(
        v.provider === "click" ? -6 : -31008,
        "Transaction mismatch",
      );
    return row;
  }
  private prepare(v: VerifiedPayment, now: number) {
    if (
      v.provider === "payme" &&
      (now - v.providerTime! > 43200000 || v.providerTime! > now + 300000)
    ) {
      const prior = this.byTransaction(v.provider, v.transactionId);
      if (prior?.state === 1) this.cancel({ ...v, reason: 4 }, now);
      throw new ProviderError(-31008, "Transaction timed out");
    }
    return this.transaction(() => {
      const duplicate = v.transactionId
        ? this.byTransaction(v.provider, v.transactionId)
        : undefined;
      const row = duplicate ?? this.checked(v);
      if (
        duplicate &&
        (row.order_id !== v.orderId ||
          row.amount_minor !== v.amountMinor ||
          (v.provider === "payme" && row.provider_time !== v.providerTime))
      )
        throw new ProviderError(
          v.provider === "click" ? -8 : -31008,
          "Transaction retry changed",
        );
      if (row.state < 0)
        throw new ProviderError(
          v.provider === "click" ? -9 : -31008,
          "Transaction cancelled",
        );
      const order = this.store.order(row.owner_id, row.order_id);
      if (row.state === 2) return row;
      if (order.status !== "pending")
        throw new ProviderError(
          v.provider === "click" ? -4 : -31008,
          "Order cannot be paid",
        );
      if (row.transaction_id && row.transaction_id !== v.transactionId)
        throw new ProviderError(-31008, "Another transaction is active");
      const collision = this.byTransaction(v.provider, v.transactionId);
      if (collision && collision.id !== row.id)
        throw new ProviderError(-31008, "Transaction already used");
      if (row.state === 0)
        this.store.db
          .prepare(
            "UPDATE payment_invoices SET state=1,transaction_id=?,provider_time=?,prepare_time=? WHERE id=?",
          )
          .run(v.transactionId, v.providerTime ?? now, now, row.id);
      return this.byTransaction(v.provider, v.transactionId)!;
    });
  }
  private complete(v: VerifiedPayment, now: number) {
    const row = this.checked(v);
    if (row.state === 2) return row;
    if (row.state !== 1)
      throw new ProviderError(
        v.provider === "click" ? (row.state < 0 ? -9 : -6) : -31008,
        "Transaction cannot complete",
      );
    if (v.provider === "payme" && now - row.provider_time > 43200000) {
      this.cancel({ ...v, reason: 4 }, now);
      throw new ProviderError(-31008, "Transaction timed out");
    }
    const raw = JSON.stringify({
      eventId: "provider-" + row.public_id,
      orderId: row.order_id,
      amountMinor: row.amount_minor,
      currency: "UZS",
      status: "paid",
      timestamp: now,
    });
    this.store.payment(raw, this.store.signSandbox(raw), () => {
      this.store.db
        .prepare(
          "UPDATE payment_invoices SET state=2,perform_time=? WHERE id=? AND state=1",
        )
        .run(now, row.id);
    });
    return this.byTransaction(v.provider, v.transactionId)!;
  }
  private cancel(v: VerifiedPayment, now: number) {
    const row = this.checked(v);
    if (row.state < 0) return row;
    if (row.state === 2)
      throw new ProviderError(
        v.provider === "click" ? -4 : -31007,
        "Credits already delivered; use merchant return resolution",
      );
    this.store.cancelOrder(row.owner_id, row.order_id, () => {
      this.store.db
        .prepare(
          "UPDATE payment_invoices SET state=-1,transaction_id=COALESCE(transaction_id,?),cancel_time=?,reason=? WHERE id=?",
        )
        .run(v.transactionId || null, now, v.reason ?? 1, row.id);
    });
    return this.active(row.order_id, v.provider)!;
  }
  callback(
    provider: PaymentProvider,
    body: Record<string, unknown>,
    authorization = "",
    now = Date.now(),
  ) {
    try {
      const adapter = this.adapters.get(provider);
      if (!adapter)
        throw new ProviderError(-32504, "Payment provider unavailable");
      const v = adapter.verify(body, authorization);
      if (provider === "payme" && v.operation === "statement") {
        const rows = this.store.db
          .prepare(
            "SELECT * FROM payment_invoices WHERE provider='payme' AND transaction_id IS NOT NULL AND provider_time>=? AND provider_time<=? ORDER BY provider_time,id",
          )
          .all(v.from!, v.to!) as Invoice[];
        return {
          id: v.rpcId,
          result: {
            transactions: rows.map((row) => ({
              id: row.transaction_id,
              time: row.provider_time,
              amount: row.amount_minor,
              account: { order_id: row.order_id },
              ...this.summary(row),
            })),
          },
        };
      }
      let row: Invoice;
      if (v.operation === "check") {
        row = this.checked(v);
        const order = this.store.order(row.owner_id, row.order_id);
        if (order.status !== "pending" || row.state < 0 || row.state === 2)
          throw new ProviderError(-31008, "Order cannot be paid");
        return { id: v.rpcId, result: { allow: true } };
      }
      if (v.operation === "prepare") row = this.prepare(v, now);
      else if (v.operation === "complete") row = this.complete(v, now);
      else if (v.operation === "cancel") row = this.cancel(v, now);
      else if (v.operation === "status") row = this.checked(v);
      else throw new ProviderError(-32601, "Unknown operation");
      if (provider === "payme")
        return { id: v.rpcId, result: this.summary(row) };
      return {
        click_trans_id: v.transactionId,
        merchant_trans_id: row.order_id,
        ...(String(body.action) === "0"
          ? { merchant_prepare_id: row.id }
          : { merchant_confirm_id: row.id }),
        error: row.state < 0 ? -9 : 0,
        error_note: row.state < 0 ? "Transaction cancelled" : "Success",
      };
    } catch (e) {
      const error =
        e instanceof ProviderError
          ? e
          : new ProviderError(
              provider === "click" ? -7 : -32400,
              "Payment could not be processed",
            );
      return provider === "click"
        ? {
            error: error.code >= -9 && error.code <= -1 ? error.code : -8,
            error_note: error.message,
          }
        : {
            id:
              typeof body.id === "string" || Number.isSafeInteger(body.id)
                ? body.id
                : null,
            error: {
              code: error.code,
              message: {
                uz: "To‘lov bajarilmadi",
                ru: "Платёж не выполнен",
                en: error.message,
              },
              ...(error.data ? { data: error.data } : {}),
            },
          };
    }
  }
}
