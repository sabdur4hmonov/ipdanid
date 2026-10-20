import { randomUUID } from "node:crypto";
import { DomainError } from "./store";
import type { KitStore } from "./kit-store";
import { isCommerceCurrency } from "../src/commerce-regions";
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const exact = (v: unknown, fields: string) => {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).sort().join() !== fields
  )
    throw new DomainError("Invalid finance fields");
};
type Receipt = {
  requestKey: string;
  received: true;
  amountMinor: number;
  currency: "UZS" | "USD" | "RUB";
  reference: string;
};
export class FinanceStore {
  constructor(private store: KitStore) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS manual_receipts(order_id TEXT PRIMARY KEY REFERENCES orders(id),request_key TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS manual_refunds(order_id TEXT PRIMARY KEY REFERENCES orders(id),request_key TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS finance_reconciliations(id TEXT PRIMARY KEY,actor TEXT NOT NULL,data TEXT NOT NULL,created_at INTEGER NOT NULL);`);
  }
  private tx<T>(fn: () => T) {
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
  private log(actor: string, action: string, id: string) {
    this.store.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, id, new Date().toISOString());
  }
  private order(id: string) {
    if (!uuid(id)) throw new DomainError("Order not found", 404);
    const r = this.store.db
      .prepare(
        "SELECT user_id,status,total_minor,currency FROM orders WHERE id=?",
      )
      .get(id);
    if (!r) throw new DomainError("Order not found", 404);
    return r;
  }
  private checked(input: unknown, refund = false): Receipt {
    exact(
      input,
      refund
        ? "amountMinor,currency,reference,requestKey,returned"
        : "amountMinor,currency,received,reference,requestKey",
    );
    const v = input as Receipt & { returned?: boolean };
    if (
      (refund ? v.returned : v.received) !== true ||
      !uuid(v.requestKey) ||
      !isCommerceCurrency(v.currency) ||
      !Number.isSafeInteger(v.amountMinor) ||
      v.amountMinor < 1 ||
      typeof v.reference !== "string" ||
      v.reference.trim().length < 3 ||
      v.reference.length > 120 ||
      /[\x00-\x1f\x7f]/.test(v.reference)
    )
      throw new DomainError(
        "Acknowledge the exact amount and receipt reference",
      );
    return v;
  }
  receipt(actor: string, id: string, input: unknown) {
    const v = this.checked(input),
      payload = JSON.stringify([
        v.requestKey,
        v.received,
        v.amountMinor,
        v.currency,
        v.reference.trim(),
      ]);
    return this.tx(() => {
      const order = this.order(id),
        previous = this.store.db
          .prepare("SELECT payload FROM manual_receipts WHERE order_id=?")
          .get(id);
      if (previous) {
        if (previous.payload !== payload)
          throw new DomainError("Receipt retry differs", 409);
        return {
          duplicate: true,
          bankVerified: false,
          source: "manual",
          order: this.store.order(String(order.user_id), id),
        };
      }
      if (
        order.status !== "pending" ||
        order.total_minor !== v.amountMinor ||
        order.currency !== v.currency
      )
        throw new DomainError("Order amount or state changed", 409);
      if (
        this.store.db
          .prepare("SELECT order_id FROM manual_receipts WHERE request_key=?")
          .get(v.requestKey)
      )
        throw new DomainError("Receipt key already used", 409);
      if (
        this.store.db
          .prepare(
            "SELECT 1 FROM payment_invoices WHERE order_id=? AND state IN(1,2)",
          )
          .get(id)
      )
        throw new DomainError(
          "Resolve the active provider transaction before recording cash",
          409,
        );
      this.store.db
        .prepare(
          "UPDATE payment_invoices SET state=-1,cancel_time=?,reason=5 WHERE order_id=? AND state=0",
        )
        .run(Date.now(), id);
      const raw = JSON.stringify({
        eventId: "manual-" + v.requestKey,
        orderId: id,
        amountMinor: v.amountMinor,
        currency: v.currency,
        status: "paid",
        timestamp: Date.now(),
      });
      this.store.payment(raw, this.store.signSandbox(raw), undefined, {
        kind: "manual",
        actor,
      });
      this.store.db
        .prepare("INSERT INTO manual_receipts VALUES(?,?,?,?,?)")
        .run(id, v.requestKey, payload, actor, Date.now());
      return {
        duplicate: false,
        bankVerified: false,
        source: "manual",
        order: this.store.order(String(order.user_id), id),
      };
    });
  }
  refund(actor: string, id: string, input: unknown) {
    const v = this.checked(input, true),
      payload = JSON.stringify([
        v.requestKey,
        true,
        v.amountMinor,
        v.currency,
        v.reference.trim(),
      ]);
    return this.tx(() => {
      const order = this.order(id),
        old = this.store.db
          .prepare("SELECT payload FROM manual_refunds WHERE order_id=?")
          .get(id);
      if (old) {
        if (old.payload !== payload)
          throw new DomainError("Refund retry differs", 409);
        return {
          duplicate: true,
          bankVerified: false,
          order: this.store.order(String(order.user_id), id),
        };
      }
      if (
        !this.store.db
          .prepare("SELECT 1 FROM manual_receipts WHERE order_id=?")
          .get(id) ||
        order.status !== "return_requested" ||
        order.total_minor !== v.amountMinor ||
        order.currency !== v.currency
      )
        throw new DomainError(
          "Exact manual receipt and return request required",
          409,
        );
      if (
        this.store.db
          .prepare("SELECT order_id FROM manual_refunds WHERE request_key=?")
          .get(v.requestKey)
      )
        throw new DomainError("Refund key already used", 409);
      this.store.refund(actor, id, "manual");
      // The existing refund performs ledger/inventory reversal, not a bank call.
      this.store.db
        .prepare("INSERT INTO manual_refunds VALUES(?,?,?,?,?)")
        .run(id, v.requestKey, payload, actor, Date.now());
      this.log(actor, "payment.manual-refund-recorded", id);
      return {
        duplicate: false,
        bankVerified: false,
        order: this.store.order(String(order.user_id), id),
      };
    });
  }
  reconciliation() {
    const orders = this.store.db
      .prepare(
        "SELECT id,status,total_minor,currency FROM orders ORDER BY created_at DESC,id DESC LIMIT 200",
      )
      .all()
      .map((o) => {
        const rows = this.store.db
            .prepare(
              "SELECT event_id,provider,amount_minor FROM payments WHERE order_id=? AND status='paid'",
            )
            .all(o.id),
          invoices = this.store.db
            .prepare(
              "SELECT public_id,provider,state,amount_minor,created_at FROM payment_invoices WHERE order_id=? ORDER BY id",
            )
            .all(o.id),
          receipt = this.store.db
            .prepare("SELECT created_at FROM manual_receipts WHERE order_id=?")
            .get(o.id);
        const problems: string[] = [];
        if (rows.length > 1) problems.push("multiple-settlements");
        if (rows.some((r) => r.amount_minor !== o.total_minor))
          problems.push("amount-mismatch");
        if (
          ["paid", "fulfilled", "return_requested", "refunded"].includes(
            String(o.status),
          ) &&
          !rows.length
        )
          problems.push("missing-local-settlement");
        if (["pending", "cancelled"].includes(String(o.status)) && rows.length)
          problems.push("order-state-mismatch");
        if (invoices.some((r) => r.state === 2) && !rows.length)
          problems.push("invoice-state-mismatch");
        if (
          invoices.some(
            (r) =>
              r.state === 1 && Date.now() - Number(r.created_at) > 43200000,
          )
        )
          problems.push("provider-resolution-required");
        return {
          id: String(o.id),
          status: String(o.status),
          amountMinor: Number(o.total_minor),
          currency: String(o.currency),
          settlement: receipt ? "manual" : rows.length ? "sandbox" : "none",
          settlementCount: rows.length,
          invoices: invoices.map((r) => ({
            id: String(r.public_id),
            provider: String(r.provider),
            state: Number(r.state),
            amountMinor: Number(r.amount_minor),
          })),
          problems,
        };
      });
    const comparisons = this.store.db
      .prepare(
        "SELECT id,data,created_at FROM finance_reconciliations ORDER BY created_at DESC,id DESC LIMIT 20",
      )
      .all()
      .map((r) => ({
        id: String(r.id),
        createdAt: Number(r.created_at),
        ...JSON.parse(String(r.data)),
      }));
    return {
      bankVerified: false,
      scope: "local-records-only",
      orders,
      comparisons,
    };
  }
  compare(actor: string, input: unknown) {
    exact(input, "rows");
    const rows = (input as { rows: unknown }).rows;
    if (!Array.isArray(rows) || !rows.length || rows.length > 200)
      throw new DomainError("Statement must contain 1-200 rows");
    const seen = new Set<string>();
    const results = rows.map((raw) => {
      exact(raw, "amountMinor,currency,invoiceId,provider,state");
      const r = raw as {
        amountMinor: number;
        currency: string;
        invoiceId: string;
        provider: string;
        state: number;
      };
      if (
        !uuid(r.invoiceId) ||
        !["click", "payme"].includes(r.provider) ||
        r.currency !== "UZS" ||
        ![0, 1, 2, -1].includes(r.state) ||
        !Number.isSafeInteger(r.amountMinor) ||
        r.amountMinor < 1 ||
        seen.has(r.invoiceId)
      )
        throw new DomainError("Invalid or duplicate statement row");
      seen.add(r.invoiceId);
      const local = this.store.db
        .prepare(
          "SELECT provider,state,amount_minor FROM payment_invoices WHERE public_id=?",
        )
        .get(r.invoiceId);
      return {
        invoiceId: r.invoiceId,
        result: !local
          ? "missing-local"
          : local.provider !== r.provider
            ? "provider-mismatch"
            : local.amount_minor !== r.amountMinor
              ? "amount-mismatch"
              : local.state !== r.state
                ? "state-mismatch"
                : "matches",
      };
    });
    return this.tx(() => {
      if (
        Number(
          this.store.db
            .prepare(
              "SELECT COUNT(*) n FROM finance_reconciliations WHERE actor=? AND created_at>?",
            )
            .get(actor, Date.now() - 86400000)?.n,
        ) >= 100
      )
        throw new DomainError("Daily reconciliation limit reached", 429);
      const id = randomUUID(),
        data = {
          bankVerified: false,
          source: "staff-supplied-statement",
          results,
        };
      this.store.db
        .prepare("INSERT INTO finance_reconciliations VALUES(?,?,?,?)")
        .run(id, actor, JSON.stringify(data), Date.now());
      this.log(actor, "payment.statement-compared", id);
      return { id, ...data };
    });
  }
}
