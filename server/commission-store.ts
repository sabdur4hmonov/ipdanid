import { createHash, randomUUID } from "node:crypto";
import { DomainError } from "./store";
import type { CustomerStore } from "./customer-store";
import { BusinessStore } from "./business-store";
import { isCommerceCurrency } from "../src/commerce-regions";
import type { Instruction } from "../src/core/types";
import type {
  Commission,
  CommissionPolicy,
  CommissionAccept,
} from "../src/commission-types";
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
    throw new DomainError("Invalid commission fields");
};
type Saved = Omit<Commission, "order"> & {
  buyer: string;
  requestKey: string;
  orderId: string | null;
  acceptPayload: string | null;
  guide: Instruction;
};
export class CommissionStore {
  private accepting: string | null = null;
  constructor(private store: CustomerStore) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS commission_products(product_id TEXT PRIMARY KEY REFERENCES products(id),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commissions(id TEXT PRIMARY KEY,buyer_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,payload TEXT NOT NULL,data TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(buyer_id,request_key));`);
    const previous = store.orderLifecycle;
    store.orderLifecycle = {
      assertItems: (items, method) => {
        previous?.assertItems(items, method);
        for (const item of items)
          if (
            this.policy(item.productId) &&
            (this.accepting !== item.productId ||
              items.length !== 1 ||
              item.quantity !== 1)
          )
            throw new DomainError("Use the approved commission flow", 409);
      },
      paid: (id) => previous?.paid(id),
      beforeRefund: (id) => {
        previous?.beforeRefund(id);
        const row = this.byOrder(id);
        if (row && row.production !== "queued")
          throw new DomainError(
            "Production has started; manual resolution required",
            409,
          );
      },
      beforeFulfill: (id) => {
        previous?.beforeFulfill?.(id);
        const row = this.byOrder(id);
        if (row && row.production !== "ready")
          throw new DomainError(
            "Approve production as ready before shipping",
            409,
          );
      },
    };
  }
  private tx<T>(fn: () => T): T {
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
      .run(
        randomUUID(),
        actor,
        "commission." + action,
        id,
        new Date().toISOString(),
      );
  }
  private maker(user: string) {
    if (
      this.store.db.prepare("SELECT role FROM users WHERE id=?").get(user)
        ?.role !== "maker"
    )
      throw new DomainError("Register or use a kit account first", 403);
  }
  private product(id: string) {
    const p = this.store.products().find((p) => p.id === id);
    if (
      !p ||
      p.active !== 1 ||
      p.family !== "string" ||
      p.credits !== 0 ||
      !isCommerceCurrency(p.currency) ||
      Number(p.price_minor) <= 0 ||
      this.store.inventory?.sku(id)?.sellable === false
    )
      throw new DomainError("Ready-made product unavailable", 409);
    return p;
  }
  policy(id: string): CommissionPolicy | null {
    const r = this.store.db
      .prepare("SELECT data FROM commission_products WHERE product_id=?")
      .get(id);
    return r ? JSON.parse(String(r.data)) : null;
  }
  policies(publicOnly = false): CommissionPolicy[] {
    return this.store.db
      .prepare(
        "SELECT data FROM commission_products ORDER BY product_id LIMIT 1000",
      )
      .all()
      .map((r) => JSON.parse(String(r.data)) as CommissionPolicy)
      .filter((p) => {
        if (!publicOnly) return true;
        try {
          return p.enabled && !!this.product(p.productId);
        } catch {
          return false;
        }
      });
  }
  save(actor: string, input: unknown): CommissionPolicy {
    exact(input, "enabled,productId,revision,version");
    const p = input as CommissionPolicy;
    if (
      p.version !== "commission-product/1" ||
      typeof p.productId !== "string" ||
      !/^[a-z0-9-]{2,80}$/.test(p.productId) ||
      typeof p.enabled !== "boolean" ||
      !Number.isSafeInteger(p.revision) ||
      p.revision < 0
    )
      throw new DomainError("Invalid commission product");
    return this.tx(() => {
      const old = this.policy(p.productId);
      if ((old?.revision ?? 0) !== p.revision)
        throw new DomainError("Commission product changed", 409);
      if (p.enabled) this.product(p.productId);
      else if (!old) throw new DomainError("Commission product not found", 404);
      const next = { ...p, revision: p.revision + 1 };
      this.store.db
        .prepare(
          "INSERT INTO commission_products VALUES(?,?) ON CONFLICT(product_id) DO UPDATE SET data=excluded.data",
        )
        .run(p.productId, JSON.stringify(next));
      this.log(actor, "product", p.productId);
      return next;
    });
  }
  private read(id: string, user?: string): Saved {
    if (!uuid(id)) throw new DomainError("Commission not found", 404);
    const r = this.store.db
      .prepare("SELECT buyer_id,data FROM commissions WHERE id=?")
      .get(id);
    if (!r || (user !== undefined && r.buyer_id !== user))
      throw new DomainError("Commission not found", 404);
    return JSON.parse(String(r.data));
  }
  private byOrder(id: string): Saved | null {
    const r = this.store.db
      .prepare(
        "SELECT data FROM commissions WHERE json_extract(data,'$.orderId')=?",
      )
      .get(id);
    return r ? JSON.parse(String(r.data)) : null;
  }
  private write(v: Saved) {
    this.store.db
      .prepare("UPDATE commissions SET data=? WHERE id=?")
      .run(JSON.stringify(v), v.id);
  }
  private dto(v: Saved): Commission {
    const { buyer, requestKey, orderId, acceptPayload, guide, ...publicValue } =
      v;
    void buyer;
    void requestKey;
    void acceptPayload;
    void guide;
    const o = orderId
      ? this.store.orders(v.buyer).find((o) => o.id === orderId)
      : null;
    return {
      ...publicValue,
      order: o
        ? {
            id: o.id,
            status: o.status,
            totalMinor: o.total_minor,
            currency: this.store.order(v.buyer, o.id).currency,
            tracking: o.fulfillments.map((t) => String(t.tracking)),
          }
        : null,
    };
  }
  get(user: string, id: string) {
    return this.dto(this.read(id, user));
  }
  list(user?: string): Commission[] {
    const rows =
      user === undefined
        ? this.store.db
            .prepare(
              "SELECT data FROM commissions ORDER BY created_at DESC,id DESC LIMIT 100",
            )
            .all()
        : this.store.db
            .prepare(
              "SELECT data FROM commissions WHERE buyer_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
            )
            .all(user);
    return rows.map((r) => {
      const row = JSON.parse(String(r.data)) as Saved;
      return {
        ...this.dto(row),
        ...(user === undefined
          ? { reviewQuote: this.reviewQuote(row.id) }
          : {}),
      };
    });
  }
  reviewQuote(id: string): Commission["reviewQuote"] {
    const row = this.read(id);
    try {
      if (!this.policy(row.productId)?.enabled) return null;
      const p = this.product(row.productId);
      return {
        productRevision: Number(p.revision),
        catalogRevision: this.store.inventory?.revision() ?? 0,
        settingsRevision: new BusinessStore(this.store).settings().revision,
        currency: p.currency as "UZS" | "USD" | "RUB",
        priceMinor: Number(p.price_minor),
      };
    } catch {
      return null;
    }
  }
  guide(user: string | undefined, id: string) {
    const v = this.read(id, user);
    return { artHash: v.artHash, instruction: v.guide };
  }
  request(user: string, input: unknown): Commission {
    exact(input, "consent,instructionId,locale,productId,requestKey");
    const v = input as {
      consent: boolean;
      instructionId: string;
      locale: string;
      productId: string;
      requestKey: string;
    };
    if (
      v.consent !== true ||
      !uuid(v.instructionId) ||
      !uuid(v.requestKey) ||
      !["uz", "uz-Cyrl", "ru", "en"].includes(v.locale) ||
      typeof v.productId !== "string"
    )
      throw new DomainError("Explicit art sharing consent required");
    this.maker(user);
    return this.tx(() => {
      const old = this.store.db
          .prepare(
            "SELECT payload,data FROM commissions WHERE buyer_id=? AND request_key=?",
          )
          .get(user, v.requestKey),
        payload = JSON.stringify([
          v.productId,
          v.instructionId,
          v.locale,
          v.consent,
        ]);
      if (old) {
        if (old.payload !== payload)
          throw new DomainError("Commission retry differs", 409);
        return this.dto(JSON.parse(String(old.data)));
      }
      const active = this.store.db
        .prepare(
          "SELECT COUNT(*) n FROM commissions WHERE buyer_id=? AND created_at>?",
        )
        .get(user, Date.now() - 86400000);
      if (Number(active?.n) >= 20)
        throw new DomainError("Daily commission limit reached", 429);
      if (!this.policy(v.productId)?.enabled)
        throw new DomainError("Commission unavailable", 409);
      const p = this.product(v.productId),
        guide = this.store.instruction(user, v.instructionId);
      if (p.profile_id !== guide.profile.id)
        throw new DomainError("Board profile does not match this art", 409);
      const artHash = createHash("sha256")
          .update(JSON.stringify(guide))
          .digest("hex"),
        id = randomUUID();
      const row: Saved = {
        version: "commission/1",
        id,
        revision: 1,
        buyer: user,
        requestKey: v.requestKey,
        orderId: null,
        acceptPayload: null,
        productId: v.productId,
        productName: String(p.name),
        instructionId: v.instructionId,
        sequenceHash: guide.sequenceHash,
        artHash,
        lines: guide.metrics.lines,
        widthMm: guide.profile.widthMm,
        heightMm: guide.profile.heightMm,
        guide,
        state: "requested",
        production: "queued",
        note: "",
        approval: null,
      };
      this.store.db
        .prepare("INSERT INTO commissions VALUES(?,?,?,?,?,?)")
        .run(id, user, v.requestKey, payload, JSON.stringify(row), Date.now());
      this.log(user, "consent-request", id);
      return this.dto(row);
    });
  }
  review(actor: string, id: string, input: unknown): Commission {
    exact(input, "artHash,decision,note,quote,revision");
    const v = input as {
      artHash: string;
      decision: string;
      note: string;
      revision: number;
      quote: Commission["reviewQuote"];
    };
    if (
      !["approve", "reject"].includes(v.decision) ||
      typeof v.note !== "string" ||
      v.note.length > 1000 ||
      !Number.isSafeInteger(v.revision)
    )
      throw new DomainError("Invalid commission review");
    return this.tx(() => {
      const row = this.read(id);
      if (
        !["requested", "approved", "rejected"].includes(row.state) ||
        row.revision !== v.revision ||
        row.artHash !== v.artHash
      )
        throw new DomainError("Commission changed; review again", 409);
      row.note = v.note.trim();
      if (v.decision === "approve") {
        if (!this.policy(row.productId)?.enabled)
          throw new DomainError("Commission unavailable", 409);
        const p = this.product(row.productId);
        const current = this.reviewQuote(id);
        exact(
          v.quote,
          "catalogRevision,currency,priceMinor,productRevision,settingsRevision",
        );
        if (
          !current ||
          Object.entries(current).some(
            ([k, value]) => v.quote?.[k as keyof typeof current] !== value,
          )
        )
          throw new DomainError(
            "Price changed; refresh the workshop quote",
            409,
          );
        if (p.profile_id !== row.guide.profile.id || Number(p.stock) < 1)
          throw new DomainError("Board unavailable", 409);
        row.approval = {
          productRevision: Number(p.revision),
          catalogRevision: this.store.inventory?.revision() ?? 0,
          settingsRevision: new BusinessStore(this.store).settings().revision,
          currency: p.currency as "UZS" | "USD" | "RUB",
          priceMinor: Number(p.price_minor),
          expiresAt: Date.now() + 7 * 86400000,
        };
        row.state = "approved";
      } else {
        row.state = "rejected";
        row.approval = null;
      }
      ++row.revision;
      this.write(row);
      this.log(actor, v.decision, id);
      this.store.transactionalEvent?.(v.decision==="approve"?"commission-approved":"commission-declined",id,row.revision);
      return this.dto(row);
    });
  }
  accept(user: string, id: string, input: unknown): Commission {
    exact(input, "address,artHash,quote,requestKey,revision");
    const v = input as CommissionAccept;
    if (!uuid(v.requestKey) || !Number.isSafeInteger(v.revision))
      throw new DomainError("Invalid commission acceptance");
    exact(v.address, "city,country,deliveryMethod,name,phone,street");
    exact(
      v.quote,
      "catalogRevision,currency,settingsRevision,shippingRevision,totalMinor",
    );
    const payload = JSON.stringify([
      v.revision,
      v.requestKey,
      v.artHash,
      v.address.name,
      v.address.phone,
      v.address.city,
      v.address.street,
      v.address.country,
      v.address.deliveryMethod,
      v.quote.catalogRevision,
      v.quote.currency,
      v.quote.settingsRevision,
      v.quote.shippingRevision,
      v.quote.totalMinor,
    ]);
    return this.tx(() => {
      const row = this.read(id, user);
      if (row.orderId) {
        if (row.acceptPayload !== payload)
          throw new DomainError("Commission acceptance retry differs", 409);
        return this.dto(row);
      }
      const a = row.approval;
      if (
        row.state !== "approved" ||
        row.revision !== v.revision ||
        row.artHash !== v.artHash ||
        !a ||
        a.expiresAt <= Date.now()
      )
        throw new DomainError("Review the approved art and price first", 409);
      const p = this.product(row.productId);
      if (
        !this.policy(row.productId)?.enabled ||
        p.revision !== a.productRevision ||
        p.price_minor !== a.priceMinor ||
        p.profile_id !== row.guide.profile.id ||
        (this.store.inventory?.revision() ?? 0) !== a.catalogRevision ||
        v.quote.catalogRevision !== a.catalogRevision ||
        v.quote.settingsRevision !== a.settingsRevision ||
        v.quote.currency !== a.currency
      )
        throw new DomainError(
          "Price or board changed; owner must review again",
          409,
        );
      this.accepting = row.productId;
      try {
        if (
          this.store.db
            .prepare(
              "SELECT id FROM orders WHERE user_id=? AND idempotency_key=?",
            )
            .get(user, "commission:" + id + ":" + v.requestKey)
        )
          throw new DomainError("Commission order key already used", 409);
        const order = this.store.submitOrder(
          user,
          [{ productId: row.productId, quantity: 1 }],
          v.address,
          "commission:" + id + ":" + v.requestKey,
          v.quote,
        );
        row.orderId = order.id;
        row.acceptPayload = payload;
        row.state = "accepted";
        ++row.revision;
        this.write(row);
        this.log(user, "accept-art-price", id);
        return this.dto(row);
      } finally {
        this.accepting = null;
      }
    });
  }
  cancel(user: string, id: string, revision: unknown) {
    return this.tx(() => {
      const row = this.read(id, user);
      if (row.state === "cancelled") return this.dto(row);
      if (!Number.isSafeInteger(revision) || row.revision !== revision)
        throw new DomainError("Commission changed", 409);
      if (row.orderId) this.store.cancelOrder(user, row.orderId);
      row.state = "cancelled";
      ++row.revision;
      this.write(row);
      this.log(user, "cancel", id);
      return this.dto(row);
    });
  }
  produce(actor: string, id: string, input: unknown) {
    exact(input, "artHash,revision,state");
    const v = input as { artHash: string; revision: number; state: string };
    return this.tx(() => {
      const row = this.read(id),
        order = row.orderId && this.store.order(row.buyer, row.orderId);
      if (
        !order ||
        order.status !== "paid" ||
        row.revision !== v.revision ||
        row.artHash !== v.artHash ||
        !(
          (row.production === "queued" && v.state === "making") ||
          (row.production === "making" && v.state === "ready")
        )
      )
        throw new DomainError(
          "Paid commission and next production step required",
          409,
        );
      row.production = v.state as Saved["production"];
      ++row.revision;
      this.write(row);
      this.log(actor, v.state, id);
      this.store.transactionalEvent?.(v.state==="making"?"commission-making":"commission-ready",id,row.revision);
      return this.dto(row);
    });
  }
}
