import { randomUUID } from "node:crypto";
import type { CustomerStore } from "./customer-store";
import { DomainError, type OrderLifecycle } from "./store";
import { isCommerceCurrency } from "../src/commerce-regions";
import type {
  DigitalKind,
  JourneyProduct,
  DigitalPurchase,
} from "../src/journey-types";
type PurchaseInput = {
  productId: string;
  kind: DigitalKind;
  name: string;
  locale: string;
  requestKey: string;
  quote: {
    productRevision: number;
    settingsRevision: number;
    catalogRevision?: number;
    currency: "UZS" | "USD" | "RUB";
    totalMinor: number;
  };
};
type Snapshot = {
  kind: DigitalKind;
  name: string;
  credits: number;
  productId: string;
  giftId: string | null;
};
export class JourneyStore implements OrderLifecycle {
  constructor(private store: CustomerStore) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS journey_products(product_id TEXT PRIMARY KEY REFERENCES products(id),revision INTEGER NOT NULL,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS digital_purchases(order_id TEXT PRIMARY KEY REFERENCES orders(id),buyer_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,payload TEXT NOT NULL,snapshot TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(buyer_id,request_key));`);
    store.orderLifecycle = this;
  }
  private exact(v: unknown, keys: string) {
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).sort().join(",") !== keys
    )
      throw new DomainError("Invalid purchase fields");
  }
  private tx<T>(fn: () => T): T {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.store.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  private product(id: string) {
    const p = this.store.products().find((p) => p.id === id),
      sku = this.store.inventory?.sku(id);
    if (
      !p ||
      p.active !== 1 ||
      p.family !== "digital" ||
      !isCommerceCurrency(p.currency) ||
      Number(p.price_minor) < 1 ||
      !Number.isSafeInteger(p.price_minor) ||
      !Number.isSafeInteger(p.credits) ||
      Number(p.credits) < 1 ||
      Number(p.credits) > 100 ||
      (sku && (!sku.sellable || sku.parts.length))
    )
      throw new DomainError("Digital product unavailable", 409);
    return p;
  }
  policy(id: string) {
    const row = this.store.db
      .prepare("SELECT data FROM journey_products WHERE product_id=?")
      .get(id);
    return row ? (JSON.parse(String(row.data)) as JourneyProduct) : null;
  }
  policies() {
    return this.store.db
      .prepare(
        "SELECT data FROM journey_products ORDER BY product_id LIMIT 1000",
      )
      .all()
      .map((r) => JSON.parse(String(r.data)) as JourneyProduct);
  }
  publicPolicies() {
    const visible = new Set(this.store.catalog().map((p) => String(p.id)));
    return this.policies()
      .filter((p) => p.enabled && visible.has(p.productId))
      .filter((p) => {
        try {
          this.product(p.productId);
          return true;
        } catch {
          return false;
        }
      });
  }
  save(actor: string, input: unknown) {
    this.exact(input, "enabled,kind,productId,revision,version");
    const p = input as JourneyProduct;
    if (
      p.version !== "journey-product/1" ||
      typeof p.productId !== "string" ||
      !/^[-a-z0-9]{2,80}$/.test(p.productId) ||
      typeof p.kind !== "string" ||
      !["app", "gift"].includes(p.kind) ||
      typeof p.enabled !== "boolean" ||
      !Number.isSafeInteger(p.revision) ||
      p.revision < 0
    )
      throw new DomainError("Invalid digital product policy");
    return this.tx(() => {
      const old = this.policy(p.productId);
      if ((old?.revision ?? 0) !== p.revision)
        throw new DomainError("Digital terms changed", 409);
      if (!this.store.products().some((v) => v.id === p.productId))
        throw new DomainError("Product not found", 404);
      if (p.enabled) this.product(p.productId);
      if (!old && this.policies().length >= 1000)
        throw new DomainError("Digital product limit", 409);
      const next = { ...p, revision: p.revision + 1 };
      this.store.db
        .prepare(
          "INSERT INTO journey_products VALUES(?,?,?) ON CONFLICT(product_id) DO UPDATE SET revision=excluded.revision,data=excluded.data",
        )
        .run(p.productId, next.revision, JSON.stringify(next));
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          actor,
          "digital.policy",
          p.productId,
          new Date().toISOString(),
        );
      return next;
    });
  }
  assertItems(
    items: { productId: string; quantity: number }[],
    method: string | undefined,
  ) {
    for (const i of items) {
      const p = this.policy(i.productId);
      if (p && method !== "online")
        throw new DomainError("Use the digital purchase flow", 409);
      if (
        method === "online" &&
        (!p?.enabled || i.quantity !== 1 || items.length !== 1)
      )
        throw new DomainError("Digital purchase unavailable", 409);
    }
  }
  purchase(user: string, input: unknown): DigitalPurchase {
    this.exact(input, "kind,locale,name,productId,quote,requestKey");
    const v = input as PurchaseInput;
    if (
      typeof v.productId !== "string" ||
      !/^[-a-z0-9]{2,80}$/.test(v.productId) ||
      typeof v.kind !== "string" ||
      !["app", "gift"].includes(v.kind) ||
      typeof v.name !== "string" ||
      v.name.trim().length < 2 ||
      v.name.length > 120 ||
      /[\x00-\x1f\x7f]/.test(v.name) ||
      typeof v.locale !== "string" ||
      !["uz", "uz-Cyrl", "ru", "en"].includes(v.locale) ||
      typeof v.requestKey !== "string" ||
      !/^[a-f0-9-]{36}$/.test(v.requestKey)
    )
      throw new DomainError("Invalid digital purchase");
    this.exact(
      v.quote,
      v.quote?.catalogRevision === undefined
        ? "currency,productRevision,settingsRevision,totalMinor"
        : "catalogRevision,currency,productRevision,settingsRevision,totalMinor",
    );
    if (
      !isCommerceCurrency(v.quote.currency) ||
      ![
        v.quote.productRevision,
        v.quote.settingsRevision,
        v.quote.totalMinor,
        ...(v.quote.catalogRevision === undefined
          ? []
          : [v.quote.catalogRevision]),
      ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
      v.quote.totalMinor < 1
    )
      throw new DomainError("Invalid digital quote");
    const payload = JSON.stringify({
      productId: v.productId,
      kind: v.kind,
      name: v.name,
      locale: v.locale,
      quote: {
        productRevision: v.quote.productRevision,
        settingsRevision: v.quote.settingsRevision,
        currency: v.quote.currency,
        totalMinor: v.quote.totalMinor,
        ...(v.quote.catalogRevision === undefined
          ? {}
          : { catalogRevision: v.quote.catalogRevision }),
      },
    });
    return this.tx(() => {
      if (
        this.store.db.prepare("SELECT role FROM users WHERE id=?").get(user)
          ?.role !== "maker"
      )
        throw new DomainError("A durable account is required", 403);
      const old = this.store.db
        .prepare(
          "SELECT order_id,payload FROM digital_purchases WHERE buyer_id=? AND request_key=?",
        )
        .get(user, v.requestKey);
      if (old) {
        if (old.payload !== payload)
          throw new DomainError("Digital retry parameters differ", 409);
        return this.get(user, String(old.order_id));
      }
      if (
        Number(
          this.store.db
            .prepare(
              "SELECT COUNT(*) n FROM digital_purchases WHERE buyer_id=? AND created_at>?",
            )
            .get(user, Date.now() - 86400000)!.n,
        ) >= 100 ||
        Number(
          this.store.db
            .prepare(
              "SELECT COUNT(*) n FROM digital_purchases d JOIN orders o ON o.id=d.order_id WHERE d.buyer_id=? AND o.status='pending'",
            )
            .get(user)!.n,
        ) >= 10
      )
        throw new DomainError("Digital purchase limit", 429);
      const policy = this.policy(v.productId),
        p = this.product(v.productId);
      if (
        !policy?.enabled ||
        policy.kind !== v.kind ||
        Number(p.revision) !== v.quote.productRevision ||
        p.currency !== v.quote.currency ||
        Number(p.price_minor) !== v.quote.totalMinor
      )
        throw new DomainError("Digital terms changed; review purchase", 409);
      const order = this.store.createDigitalOrder(
        user,
        v.productId,
        v.name,
        v.requestKey,
        {
          totalMinor: v.quote.totalMinor,
          settingsRevision: v.quote.settingsRevision,
          currency: v.quote.currency,
          ...(v.quote.catalogRevision === undefined
            ? {}
            : { catalogRevision: v.quote.catalogRevision }),
        },
      );
      const snapshot: Snapshot = {
        kind: v.kind,
        name: String(p.name),
        credits: Number(p.credits),
        productId: v.productId,
        giftId: null,
      };
      this.store.db
        .prepare("INSERT INTO digital_purchases VALUES(?,?,?,?,?,?)")
        .run(
          order.id,
          user,
          v.requestKey,
          payload,
          JSON.stringify(snapshot),
          Date.now(),
        );
      return this.get(user, order.id);
    });
  }
  get(user: string, id: string): DigitalPurchase {
    const row = this.store.db
      .prepare(
        "SELECT d.snapshot,o.status,o.total_minor,o.currency FROM digital_purchases d JOIN orders o ON o.id=d.order_id WHERE d.order_id=? AND d.buyer_id=?",
      )
      .get(id, user);
    if (!row) throw new DomainError("Purchase not found", 404);
    const s = JSON.parse(String(row.snapshot)) as Snapshot;
    return {
      version: "digital-purchase/1",
      orderId: id,
      kind: s.kind,
      productId: s.productId,
      name: s.name,
      credits: s.credits,
      currency: String(row.currency),
      totalMinor: Number(row.total_minor),
      status: String(row.status),
      gift: s.giftId ? this.store.purchasedGift(user, s.giftId) : null,
    };
  }
  list(user: string) {
    return this.store.db
      .prepare(
        "SELECT order_id FROM digital_purchases WHERE buyer_id=? ORDER BY created_at DESC,order_id DESC LIMIT 100",
      )
      .all(user)
      .map((r) => this.get(user, String(r.order_id)));
  }
  paid(orderId: string) {
    const row = this.store.db
      .prepare(
        "SELECT buyer_id,snapshot FROM digital_purchases WHERE order_id=?",
      )
      .get(orderId);
    if (!row) return;
    const s = JSON.parse(String(row.snapshot)) as Snapshot;
    if (s.kind === "gift" && !s.giftId) {
      const gift = this.store.createGift(
        String(row.buyer_id),
        s.credits,
        Date.now() + 30 * 86400000,
        "purchase-gift:" + orderId,
        true,
      );
      s.giftId = gift.id;
      this.store.db
        .prepare("UPDATE digital_purchases SET snapshot=? WHERE order_id=?")
        .run(JSON.stringify(s), orderId);
    }
  }
  beforeRefund(orderId: string) {
    const row = this.store.db
      .prepare(
        "SELECT buyer_id,snapshot FROM digital_purchases WHERE order_id=?",
      )
      .get(orderId);
    if (!row) return;
    const s = JSON.parse(String(row.snapshot)) as Snapshot;
    if (s.giftId) this.store.cancelGift(String(row.buyer_id), s.giftId);
  }
}
