import { DatabaseSync } from "node:sqlite";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { readFileSync } from "node:fs";
import type { OrderCommerce } from "../src/business-types";
import type { OrderOffer, OrderQuote } from "../src/offer-types";
import type { CatalogInventory } from "../src/catalog-types";
import {
  isCommerceCurrency,
  type RegionalCommerce,
  type CommerceCurrency,
} from "../src/commerce-regions";
export interface OrderOfferProvider {
  resolve(
    user: string,
    items: { productId: string; quantity: number }[],
    method: "pickup" | "courier",
    settingsRevision: number,
    quoteId: unknown,
  ): OrderOffer;
  attach(user: string, orderId: string, offer: OrderOffer): void;
}
import type { Instruction, Progress } from "../src/core/types";

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export interface PaymentEvent {
  eventId: string;
  orderId: string;
  amountMinor: number;
  currency: CommerceCurrency;
  status: "paid";
  timestamp: number;
}
type Order = {
  id: string;
  user_id: string;
  status: string;
  total_minor: number;
  currency: string;
};
type Product = {
  id: string;
  name: string;
  price_minor: number;
  stock: number;
  credits: number;
  currency: string;
};
export class Store {
  db: DatabaseSync;
  orderOffers?: OrderOfferProvider;
  inventory?: CatalogInventory;
  regions?: RegionalCommerce;
  constructor(
    path: string,
    private pepper: string,
    private paymentKey: string,
  ) {
    if (pepper.length < 32 || paymentKey.length < 32)
      throw new Error("Secrets must have at least 32 characters");
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    this.db.exec(
      readFileSync(
        new URL("./migrations/001_core.sql", import.meta.url),
        "utf8",
      ),
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS order_commerce(order_id TEXT PRIMARY KEY REFERENCES orders(id),data TEXT NOT NULL)",
    );
    this.migrateJobs();
    this.tx(() => {
      if (
        !this.db.prepare("SELECT version FROM migrations WHERE version=3").get()
      )
        this.db.exec(
          readFileSync(
            new URL("./migrations/003_gift_transfers.sql", import.meta.url),
            "utf8",
          ),
        );
    });
  }
  migrateJobs() {
    this.tx(() => {
      if (
        !this.db.prepare("SELECT version FROM migrations WHERE version=2").get()
      )
        this.db.exec(
          readFileSync(
            new URL("./migrations/002_job_expiry.sql", import.meta.url),
            "utf8",
          ),
        );
    });
  }
  close() {
    this.db.close();
  }
  private tx<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  digest(value: string) {
    return createHmac("sha256", this.pepper).update(value).digest("hex");
  }
  private audit(actor: string, action: string, entity: string) {
    this.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, entity, new Date().toISOString());
  }
  createGuest() {
    const id = randomUUID(),
      token = randomBytes(32).toString("base64url");
    this.tx(() => {
      this.db
        .prepare("INSERT INTO users VALUES(?,?,?)")
        .run(id, "guest", new Date().toISOString());
      this.db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(this.digest(token), id, Date.now() + 7 * 86400_000);
    });
    return { id, token };
  }
  authenticate(token: string) {
    const row = this.db
      .prepare(
        "SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?",
      )
      .get(this.digest(token), Date.now()) as { user_id: string } | undefined;
    if (!row) throw new DomainError("Authentication required", 401);
    return row.user_id;
  }
  seed() {
    this.db
      .prepare("INSERT OR IGNORE INTO products VALUES(?,?,?,?,?,?,?,?,?,?)")
      .run(
        "dev-circle",
        "Development circular material profile",
        "string",
        550000,
        "UZS",
        "dev-circle-120-dark",
        8,
        1,
        1,
        1,
      );
  }
  catalog() {
    return this.db.prepare("SELECT * FROM products WHERE active=1").all();
  }
  balance(user: string) {
    return Number(
      (
        this.db
          .prepare(
            "SELECT COALESCE(SUM(amount),0) AS value FROM credit_ledger WHERE user_id=?",
          )
          .get(user) as { value: number }
      ).value,
    );
  }
  private grant(user: string, amount: number, reason: string, source: string) {
    this.db
      .prepare("INSERT OR IGNORE INTO credit_ledger VALUES(?,?,?,?,?,?)")
      .run(
        randomUUID(),
        user,
        amount,
        reason,
        source,
        new Date().toISOString(),
      );
  }
  issueCode(profile: string, quota: number, expiresAt: number, actor: string) {
    if (typeof profile !== "string" || !profile.trim() || profile.length > 100)
      throw new DomainError("Invalid material profile");
    if (
      !Number.isInteger(quota) ||
      quota < 1 ||
      quota > 100 ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    )
      throw new DomainError("Invalid quota/expiry");
    const code = randomBytes(18).toString("base64url");
    this.db
      .prepare("INSERT INTO codes VALUES(?,?,?,?,?,?,?)")
      .run(this.digest(code), null, profile, quota, expiresAt, 0, null);
    this.audit(actor, "code.issue", this.digest(code));
    return { code, profile, quota, expiresAt };
  }
  createGift(
    buyer: string,
    credits: number,
    expiresAt: number,
    requestKey: string,
  ) {
    if (
      !Number.isInteger(credits) ||
      credits < 1 ||
      credits > 100 ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > Date.now() + 366 * 86400_000 ||
      typeof requestKey !== "string" ||
      !requestKey.trim() ||
      requestKey.length > 100
    )
      throw new DomainError("Invalid gift parameters");
    return this.tx(() => {
      const existing = this.db
        .prepare("SELECT * FROM gifts WHERE buyer_id=? AND request_key=?")
        .get(buyer, requestKey) as
        | { id: string; credits: number; expires_at: number; status: string }
        | undefined;
      if (existing) {
        if (existing.credits !== credits || existing.expires_at !== expiresAt)
          throw new DomainError("Gift retry parameters differ", 409);
        return {
          id: existing.id,
          claimToken:
            existing.status === "active"
              ? this.giftToken(existing.id, buyer)
              : undefined,
          credits,
          status: existing.status,
          expiresAt,
        };
      }
      if (this.balance(buyer) < credits)
        throw new DomainError("Insufficient gift credits", 402);
      const id = randomUUID(),
        claimToken = this.giftToken(id, buyer);
      this.db
        .prepare(
          "INSERT INTO gifts(hash,buyer_id,credits,redeemed_by,expires_at,id,request_key,status,created_at) VALUES(?,?,?,NULL,?,?,?,'active',?)",
        )
        .run(
          this.digest(claimToken),
          buyer,
          credits,
          expiresAt,
          id,
          requestKey,
          Date.now(),
        );
      this.grant(buyer, -credits, "gift-reserve", `gift-reserve:${id}`);
      this.audit(buyer, "gift.create", id);
      return { id, claimToken, credits, status: "active", expiresAt };
    });
  }
  private giftToken(id: string, buyer: string) {
    return `${id}.${this.digest(`gift-claim:${id}:${buyer}`)}`;
  }
  redeemGift(user: string, token: string) {
    if (typeof token !== "string" || token.length > 200)
      throw new DomainError("Gift unavailable", 404);
    return this.tx(() => {
      const g = this.db
        .prepare("SELECT * FROM gifts WHERE hash=?")
        .get(this.digest(token)) as
        | {
            id: string;
            buyer_id: string;
            credits: number;
            redeemed_by: string | null;
            expires_at: number;
            status: string;
          }
        | undefined;
      if (!g || !g.id) throw new DomainError("Gift unavailable", 404);
      if (g.status === "redeemed" && g.redeemed_by === user)
        return { id: g.id, credits: g.credits, alreadyRedeemed: true };
      if (g.status !== "active" || g.expires_at <= Date.now())
        throw new DomainError("Gift unavailable", 409);
      this.db
        .prepare(
          "UPDATE gifts SET redeemed_by=?,status='redeemed' WHERE hash=? AND status='active'",
        )
        .run(user, this.digest(token));
      this.grant(user, g.credits, "gift-redeem", `gift-redeem:${g.id}`);
      this.audit(user, "gift.redeem", g.id);
      return { id: g.id, credits: g.credits, alreadyRedeemed: false };
    });
  }
  cancelGift(buyer: string, id: string) {
    return this.tx(() => {
      const g = this.db
        .prepare("SELECT * FROM gifts WHERE id=? AND buyer_id=?")
        .get(id, buyer) as { credits: number; status: string } | undefined;
      if (!g) throw new DomainError("Gift not found", 404);
      if (g.status === "redeemed")
        throw new DomainError("Redeemed gift cannot be cancelled", 409);
      if (g.status === "active") {
        this.db
          .prepare("UPDATE gifts SET status='cancelled' WHERE id=?")
          .run(id);
        this.grant(buyer, g.credits, "gift-refund", `gift-refund:${id}`);
        this.audit(buyer, "gift.cancel", id);
      }
      return { id, status: g.status === "active" ? "cancelled" : g.status };
    });
  }
  expireGifts(now = Date.now()) {
    return this.tx(() => {
      const gifts = this.db
        .prepare(
          "SELECT id,buyer_id,credits FROM gifts WHERE status='active' AND expires_at<=?",
        )
        .all(now) as { id: string; buyer_id: string; credits: number }[];
      for (const g of gifts) {
        this.db
          .prepare("UPDATE gifts SET status='expired' WHERE id=?")
          .run(g.id);
        this.grant(g.buyer_id, g.credits, "gift-refund", `gift-refund:${g.id}`);
        this.audit("expiry-worker", "gift.expire", g.id);
      }
      return gifts.length;
    });
  }
  redeemCode(user: string, code: string) {
    return this.tx(() => {
      const row = this.db
        .prepare("SELECT * FROM codes WHERE hash=?")
        .get(this.digest(code)) as
        | {
            quota: number;
            profile_id: string;
            expires_at: number;
            revoked: number;
            redeemed_by: string | null;
          }
        | undefined;
      if (!row || row.revoked || row.expires_at < Date.now())
        throw new DomainError("Code unavailable");
      if (row.redeemed_by) {
        if (row.redeemed_by === user)
          return {
            profile: row.profile_id,
            balance: this.balance(user),
            duplicate: true,
          };
        throw new DomainError("Code already redeemed", 409);
      }
      this.db
        .prepare(
          "UPDATE codes SET redeemed_by=? WHERE hash=? AND redeemed_by IS NULL",
        )
        .run(user, this.digest(code));
      this.db
        .prepare("INSERT INTO redemptions VALUES(?,?,?)")
        .run(this.digest(code), user, new Date().toISOString());
      this.grant(user, row.quota, "kit-code", `code:${this.digest(code)}`);
      this.audit(user, "code.redeem", this.digest(code));
      return {
        profile: row.profile_id,
        balance: this.balance(user),
        duplicate: false,
      };
    });
  }
  revokeCode(code: string, actor: string) {
    this.db
      .prepare("UPDATE codes SET revoked=1 WHERE hash=?")
      .run(this.digest(code));
    this.audit(actor, "code.revoke", this.digest(code));
  }
  createOrder(
    user: string,
    items: { productId: string; quantity: number }[],
    address: {
      name: string;
      city: string;
      street: string;
      phone?: string;
      deliveryMethod?: string;
      country?: string;
    },
    key: string,
    commerce?: OrderCommerce | (() => OrderCommerce),
    quote?: OrderQuote,
  ) {
    if (
      quote &&
      (typeof quote !== "object" ||
        Array.isArray(quote) ||
        Object.keys(quote).some(
          (field) =>
            ![
              "totalMinor",
              "settingsRevision",
              "offerQuoteId",
              "catalogRevision",
              "currency",
              "shippingRevision",
            ].includes(field),
        ) ||
        !Number.isSafeInteger(quote.totalMinor) ||
        quote.totalMinor < 0 ||
        !Number.isSafeInteger(quote.settingsRevision) ||
        quote.settingsRevision < 0 ||
        (quote.currency !== undefined && !isCommerceCurrency(quote.currency)) ||
        (quote.shippingRevision !== undefined &&
          (!Number.isSafeInteger(quote.shippingRevision) ||
            quote.shippingRevision < 0)) ||
        (quote.catalogRevision !== undefined &&
          (!Number.isSafeInteger(quote.catalogRevision) ||
            quote.catalogRevision < 0)))
    )
      throw new DomainError("Invalid order quote");
    if (
      quote?.offerQuoteId !== undefined &&
      (typeof quote.offerQuoteId !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
          quote.offerQuoteId,
        ))
    )
      throw new DomainError("Invalid offer reference");
    if (
      typeof key !== "string" ||
      !key.trim() ||
      key.length > 100 ||
      !Array.isArray(items) ||
      !items.length ||
      items.some(
        (item) =>
          !item ||
          typeof item.productId !== "string" ||
          !item.productId ||
          item.productId.length > 100 ||
          !Number.isSafeInteger(item.quantity),
      ) ||
      items.length > 20 ||
      !address ||
      !(
        address.deliveryMethod === "pickup"
          ? [address.name]
          : [address.name, address.city, address.street]
      ).every(
        (v) => typeof v === "string" && v.trim().length >= 2 && v.length <= 200,
      ) ||
      Object.values(address).some(
        (v) => typeof v !== "string" || v.length > 200,
      )
    )
      throw new DomainError("Invalid order");
    return this.tx(() => {
      const previous = this.db
        .prepare("SELECT * FROM orders WHERE user_id=? AND idempotency_key=?")
        .get(user, key);
      if (previous) {
        const oldItems = this.db
          .prepare(
            "SELECT product_id AS productId,quantity FROM order_lines WHERE order_id=? ORDER BY product_id",
          )
          .all(previous.id);
        const normalized = items
          .map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          }))
          .sort((a, b) => a.productId.localeCompare(b.productId));
        const normalizedAddress = (a: Record<string, unknown>) =>
          JSON.stringify(
            Object.fromEntries(
              Object.entries(a).sort(([x], [y]) => x.localeCompare(y)),
            ),
          );
        if (
          JSON.stringify(oldItems) !== JSON.stringify(normalized) ||
          normalizedAddress(JSON.parse(String(previous.address))) !==
            normalizedAddress(address)
        )
          throw new DomainError("Order retry parameters differ", 409);
        const previousCommerce = this.db
            .prepare("SELECT data FROM order_commerce WHERE order_id=?")
            .get(previous.id),
          previousAccepted =
            previousCommerce &&
            JSON.parse(String(previousCommerce.data)).acceptedQuote;
        if (
          (previousAccepted?.currency !== undefined &&
            previousAccepted.currency !== quote?.currency) ||
          (previousAccepted?.shippingRevision !== undefined &&
            previousAccepted.shippingRevision !== quote?.shippingRevision)
        )
          throw new DomainError("Order retry parameters differ", 409);
        if (
          previousAccepted?.catalogRevision !== undefined &&
          previousAccepted.catalogRevision !== quote?.catalogRevision
        )
          throw new DomainError("Order retry parameters differ", 409);
        if (
          previousAccepted?.offerQuoteId &&
          previousAccepted.offerQuoteId !== quote?.offerQuoteId
        )
          throw new DomainError("Order retry parameters differ", 409);
        if (quote) {
          const old = this.db
            .prepare("SELECT data FROM order_commerce WHERE order_id=?")
            .get(previous.id);
          const accepted = old && JSON.parse(String(old.data)).acceptedQuote;
          if (
            !accepted ||
            accepted.totalMinor !== quote.totalMinor ||
            accepted.settingsRevision !== quote.settingsRevision ||
            (accepted.catalogRevision ?? null) !==
              (quote.catalogRevision ?? null) ||
            (accepted.currency ?? null) !== (quote.currency ?? null) ||
            (accepted.shippingRevision ?? null) !==
              (quote.shippingRevision ?? null) ||
            (accepted.offerQuoteId ?? null) !== (quote.offerQuoteId ?? null)
          )
            throw new DomainError("Order retry parameters differ", 409);
        }
        return previous as Order;
      }
      const seen = new Set<string>(),
        lines: { product: Product; quantity: number }[] = [];
      let total = 0;
      let currency: CommerceCurrency | undefined;
      for (const item of items) {
        if (
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 10 ||
          seen.has(item.productId)
        )
          throw new DomainError("Invalid quantity or duplicate item");
        seen.add(item.productId);
        const product = this.db
          .prepare("SELECT * FROM products WHERE id=? AND active=1")
          .get(item.productId) as Product | undefined;
        if (
          !product ||
          product.stock < item.quantity ||
          !isCommerceCurrency(product.currency)
        )
          throw new DomainError("Unavailable stock", 409);
        if (currency !== undefined && currency !== product.currency)
          throw new DomainError("Mixed currencies are not converted", 409);
        currency = product.currency as CommerceCurrency;
        total += product.price_minor * item.quantity;
        lines.push({ product, quantity: item.quantity });
      }
      this.inventory?.assertOrder(items, quote?.catalogRevision);
      const commerceSnapshot =
        typeof commerce === "function" ? commerce() : commerce;
      if (
        (currency !== "UZS" || quote?.currency !== undefined) &&
        quote?.currency !== currency
      )
        throw new DomainError("Currency changed; review checkout", 409);
      if (commerceSnapshot?.currency && commerceSnapshot.currency !== currency)
        throw new DomainError("Shipping currency mismatch", 409);
      if (commerceSnapshot) {
        if (
          !Number.isSafeInteger(commerceSnapshot.feeMinor) ||
          commerceSnapshot.feeMinor < 0 ||
          commerceSnapshot.feeMinor > 100000000
        )
          throw new DomainError("Invalid delivery fee");
        total += commerceSnapshot.feeMinor;
      }
      if (commerceSnapshot?.offer) {
        const offer = commerceSnapshot.offer;
        if (
          !this.orderOffers ||
          offer.version !== "checkout-offer/1" ||
          !Number.isSafeInteger(offer.discountMinor) ||
          offer.discountMinor < 0 ||
          offer.subtotalMinor !== total - commerceSnapshot.feeMinor ||
          offer.discountMinor >= offer.subtotalMinor ||
          quote?.offerQuoteId !== offer.quoteId
        )
          throw new DomainError("Invalid order offer");
        total -= offer.discountMinor;
      }
      if (
        quote &&
        (!Number.isSafeInteger(quote.totalMinor) ||
          quote.totalMinor !== total ||
          quote.settingsRevision !== commerceSnapshot?.settingsRevision)
      )
        throw new DomainError(
          "Prices or delivery settings changed; review checkout",
          409,
        );
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO orders VALUES(?,?,?,?,?,?,?,?)")
        .run(
          id,
          user,
          "pending",
          total,
          currency!,
          JSON.stringify(address),
          new Date().toISOString(),
          key,
        );
      for (const l of lines) {
        this.db
          .prepare("UPDATE products SET stock=stock-? WHERE id=?")
          .run(l.quantity, l.product.id);
        this.db
          .prepare("INSERT INTO order_lines VALUES(?,?,?,?,?)")
          .run(
            id,
            l.product.id,
            l.quantity,
            l.product.price_minor,
            l.product.credits,
          );
      }
      if (commerceSnapshot)
        this.db.prepare("INSERT INTO order_commerce VALUES(?,?)").run(
          id,
          JSON.stringify({
            ...commerceSnapshot,
            ...(quote ? { acceptedQuote: quote } : {}),
          }),
        );
      if (commerceSnapshot?.offer)
        this.orderOffers!.attach(user, id, commerceSnapshot.offer);
      this.inventory?.reserve("order:" + id, items);
      this.audit(user, "order.create", id);
      return this.order(user, id);
    });
  }
  order(user: string, id: string): Order {
    const order = this.db
      .prepare("SELECT * FROM orders WHERE id=? AND user_id=?")
      .get(id, user) as Order | undefined;
    if (!order) throw new DomainError("Order not found", 404);
    return order;
  }
  cancelOrder(user: string, id: string, beforeCancel?: () => void) {
    return this.tx(() => {
      const o = this.order(user, id);
      if (o.status === "cancelled") {
        beforeCancel?.();
        return o;
      }
      if (o.status !== "pending")
        throw new DomainError("Use a return request for a paid order", 409);
      beforeCancel?.();
      this.inventory?.restore("order:" + id);
      for (const l of this.db
        .prepare("SELECT product_id,quantity FROM order_lines WHERE order_id=?")
        .all(id) as { product_id: string; quantity: number }[])
        this.db
          .prepare("UPDATE products SET stock=stock+? WHERE id=?")
          .run(l.quantity, l.product_id);
      this.db
        .prepare("UPDATE orders SET status=? WHERE id=?")
        .run("cancelled", id);
      this.audit(user, "order.cancel", id);
      return this.order(user, id);
    });
  }
  signSandbox(raw: string) {
    return createHmac("sha256", this.paymentKey).update(raw).digest("hex");
  }
  payment(raw: string, signature: string, accepted?: () => void) {
    if (
      !/^[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(this.signSandbox(raw), "hex"),
      )
    )
      throw new DomainError("Invalid payment signature", 401);
    const e = JSON.parse(raw) as PaymentEvent;
    if (
      !e.eventId ||
      e.eventId.length > 100 ||
      !e.orderId ||
      !isCommerceCurrency(e.currency) ||
      e.status !== "paid" ||
      !Number.isSafeInteger(e.amountMinor) ||
      !Number.isSafeInteger(e.timestamp) ||
      Math.abs(Date.now() - e.timestamp) > 300000
    )
      throw new DomainError("Invalid or expired payment event");
    const payloadHash = createHash("sha256").update(raw).digest("hex");
    return this.tx(() => {
      const existing = this.db
        .prepare("SELECT payload_hash FROM payments WHERE event_id=?")
        .get(e.eventId) as { payload_hash: string } | undefined;
      if (existing) {
        if (existing.payload_hash !== payloadHash)
          throw new DomainError("Reused event ID with changed payload", 409);
        return { sandbox: true, duplicate: true };
      }
      const o = this.db
        .prepare("SELECT * FROM orders WHERE id=?")
        .get(e.orderId) as Order | undefined;
      if (
        !o ||
        o.total_minor !== e.amountMinor ||
        o.currency !== e.currency ||
        !["pending", "paid"].includes(o.status)
      )
        throw new DomainError("Order amount/state mismatch", 409);
      this.db
        .prepare("INSERT INTO payments VALUES(?,?,?,?,?,?,?)")
        .run(
          e.eventId,
          o.id,
          "sandbox",
          "paid",
          e.amountMinor,
          new Date().toISOString(),
          payloadHash,
        );
      if (o.status === "pending") {
        this.db
          .prepare("UPDATE orders SET status=? WHERE id=?")
          .run("paid", o.id);
        const credits = Number(
          (
            this.db
              .prepare(
                "SELECT SUM(quantity*credits) AS value FROM order_lines WHERE order_id=?",
              )
              .get(o.id) as { value: number }
          ).value,
        );
        if (credits)
          this.grant(o.user_id, credits, "sandbox-order", `order:${o.id}`);
        this.db
          .prepare("INSERT INTO messages VALUES(?,?,?,?,?,?,?)")
          .run(
            randomUUID(),
            o.user_id,
            "order-confirmation",
            JSON.stringify({ orderId: o.id, sandbox: true }),
            "queued",
            0,
            null,
          );
      }
      this.audit("sandbox-provider", "payment.accept", o.id);
      accepted?.();
      return { sandbox: true, duplicate: false };
    });
  }
  reserveGeneration(user: string, requestKey: string, sequenceHash: string) {
    if (
      !requestKey ||
      requestKey.length > 100 ||
      !/^[a-f0-9]{64}$/.test(sequenceHash)
    )
      throw new DomainError("Invalid generation request");
    return this.tx(() => {
      const existing = this.db
        .prepare("SELECT * FROM jobs WHERE user_id=? AND request_key=?")
        .get(user, requestKey) as
        { id: string; sequence_hash: string; status: string } | undefined;
      if (existing) {
        if (existing.sequence_hash !== sequenceHash)
          throw new DomainError("Request key reused for another sequence", 409);
        if (existing.status !== "failed") return existing;
        const active = this.db
          .prepare(
            "SELECT * FROM jobs WHERE user_id=? AND sequence_hash=? AND status IN ('reserved','succeeded')",
          )
          .get(user, sequenceHash);
        if (active)
          return active as {
            id: string;
            sequence_hash: string;
            status: string;
          };
        if (this.balance(user) < 1)
          throw new DomainError("No credit available", 402);
        this.db
          .prepare("UPDATE jobs SET status=?,created_at=? WHERE id=?")
          .run("reserved", Date.now(), existing.id);
        const retry = randomUUID();
        this.grant(
          user,
          -1,
          "generation-reserve",
          `job-reserve:${existing.id}:${retry}`,
        );
        return { ...existing, status: "reserved" };
      }
      const active = this.db
        .prepare(
          "SELECT * FROM jobs WHERE user_id=? AND sequence_hash=? AND status IN ('reserved','succeeded')",
        )
        .get(user, sequenceHash);
      if (active)
        return active as { id: string; sequence_hash: string; status: string };
      if (this.balance(user) < 1)
        throw new DomainError("No credit available", 402);
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO jobs VALUES(?,?,?,?,?,?,?)")
        .run(id, user, requestKey, sequenceHash, "reserved", null, Date.now());
      this.grant(user, -1, "generation-reserve", `job-reserve:${id}`);
      return { id, sequence_hash: sequenceHash, status: "reserved" };
    });
  }
  expireReservations(before = Date.now() - 10 * 60_000) {
    return this.tx(() => {
      const rows = this.db
        .prepare(
          "SELECT id,user_id FROM jobs WHERE status='reserved' AND created_at<?",
        )
        .all(before) as { id: string; user_id: string }[];
      for (const row of rows) {
        this.db
          .prepare("UPDATE jobs SET status='failed' WHERE id=?")
          .run(row.id);
        this.grant(
          row.user_id,
          1,
          "generation-timeout",
          `job-timeout:${row.id}:${randomUUID()}`,
        );
      }
      return rows.length;
    });
  }
  finishGeneration(
    user: string,
    jobId: string,
    instruction: Instruction | null,
  ) {
    return this.tx(() => {
      const job = this.db
        .prepare("SELECT * FROM jobs WHERE id=? AND user_id=?")
        .get(jobId, user) as
        | {
            status: string;
            sequence_hash: string;
            instruction_id: string | null;
          }
        | undefined;
      if (!job) throw new DomainError("Job not found", 404);
      if (job.status === "succeeded")
        return { instructionId: job.instruction_id, duplicate: true };
      if (job.status !== "reserved") return { duplicate: true };
      if (!instruction) {
        this.db
          .prepare("UPDATE jobs SET status=? WHERE id=?")
          .run("failed", jobId);
        this.grant(
          user,
          1,
          "generation-refund",
          `job-refund:${jobId}:${randomUUID()}`,
        );
        return { refunded: true };
      }
      if (instruction.sequenceHash !== job.sequence_hash)
        throw new DomainError("Sequence mismatch");
      const id = randomUUID();
      const instructionId = this.db
        .prepare("SELECT 1 FROM instructions WHERE id=?")
        .get(instruction.id)
        ? randomUUID()
        : instruction.id;
      this.db
        .prepare("INSERT INTO projects VALUES(?,?,?,?)")
        .run(id, user, "Saved instruction", null);
      this.db
        .prepare("INSERT INTO instructions VALUES(?,?,?,?,?)")
        .run(
          instructionId,
          id,
          instruction.sequenceHash,
          JSON.stringify(instruction),
          new Date().toISOString(),
        );
      this.db
        .prepare("UPDATE jobs SET status=?,instruction_id=? WHERE id=?")
        .run("succeeded", instructionId, jobId);
      return { instructionId, duplicate: false };
    });
  }
  instruction(user: string, id: string) {
    const i = this.db
      .prepare(
        "SELECT i.data FROM instructions i JOIN projects p ON p.id=i.project_id WHERE i.id=? AND p.user_id=? AND p.deleted_at IS NULL",
      )
      .get(id, user) as { data: string } | undefined;
    if (!i) throw new DomainError("Instruction not found", 404);
    return JSON.parse(i.data) as Instruction;
  }
  saveProgress(
    user: string,
    id: string,
    incoming: Progress,
    expectedRevision: number,
  ) {
    const i = this.instruction(user, id);
    if (
      !incoming ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0 ||
      incoming.sequenceHash !== i.sequenceHash ||
      !Number.isInteger(incoming.confirmed) ||
      incoming.confirmed < 0 ||
      incoming.confirmed > i.metrics.lines
    )
      throw new DomainError("Invalid progress");
    return this.tx(() => {
      const current = this.db
        .prepare("SELECT * FROM progress WHERE instruction_id=? AND user_id=?")
        .get(id, user) as { revision: number; confirmed: number } | undefined;
      if ((current?.revision ?? 0) !== expectedRevision)
        throw new DomainError(
          "Progress conflict: reload and choose which progress to keep",
          409,
        );
      const progress = {
        sequenceHash: i.sequenceHash,
        confirmed: incoming.confirmed,
        revision: expectedRevision + 1,
        updatedAt: new Date().toISOString(),
      };
      this.db
        .prepare(
          "INSERT INTO progress VALUES(?,?,?,?,?) ON CONFLICT(instruction_id,user_id) DO UPDATE SET revision=excluded.revision,confirmed=excluded.confirmed,updated_at=excluded.updated_at",
        )
        .run(
          id,
          user,
          progress.revision,
          progress.confirmed,
          progress.updatedAt,
        );
      return progress;
    });
  }
  ticket(
    user: string,
    subject: string,
    body: string,
    orderId: string | null = null,
  ) {
    if (
      !subject.trim() ||
      subject.length > 150 ||
      !body.trim() ||
      body.length > 4000
    )
      throw new DomainError("Invalid support request");
    if (orderId) this.order(user, orderId);
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO tickets VALUES(?,?,?,?,?,?,?)")
      .run(id, user, orderId, subject, body, "open", new Date().toISOString());
    return { id, state: "open", delivery: "local-only" };
  }
  recordSandboxMessages() {
    this.db.exec(
      "UPDATE messages SET state='sandbox_recorded',attempts=attempts+1 WHERE state='queued'",
    );
    return { sandbox: true, sent: false };
  }
}
