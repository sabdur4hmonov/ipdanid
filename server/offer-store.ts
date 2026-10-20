import { randomBytes, randomUUID } from "node:crypto";
import { DomainError, type OrderOfferProvider } from "./store";
import type { CustomerStore } from "./customer-store";
import { BusinessStore } from "./business-store";
import type {
  OfferRule,
  OfferQuote,
  OrderOffer,
  OrderActualCosts,
} from "../src/offer-types";
const DAY = 86400000;
type CodeRow = {
  id: string;
  code: string;
  kind: "promo" | "referral";
  owner_id: string | null;
  data: string;
  revision: number;
  active: number;
};
type QuoteRow = {
  id: string;
  user_id: string;
  code_id: string;
  data: string;
  expires_at: number;
  order_id: string | null;
};
type QuoteData = {
  catalogRevision?: number;
  items: {
    productId: string;
    quantity: number;
    price: number;
    credits: number;
  }[];
  method: "pickup" | "courier";
  ruleRevision: string;
  quote: OfferQuote;
  referrer: string | null;
};
const costKeys = [
  "fulfillmentMinor",
  "marketingMinor",
  "materialsMinor",
  "packingMinor",
  "providerFeeMinor",
  "referralRewardMinor",
] as const;
export class OfferStore implements OrderOfferProvider {
  constructor(
    private store: CustomerStore,
    private clock: () => number = Date.now,
  ) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS offer_codes(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,kind TEXT NOT NULL,owner_id TEXT REFERENCES users(id),data TEXT NOT NULL,revision INTEGER NOT NULL,active INTEGER NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS one_referral_per_account ON offer_codes(owner_id) WHERE kind='referral';
      CREATE TABLE IF NOT EXISTS offer_policy(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS offer_quotes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),code_id TEXT NOT NULL REFERENCES offer_codes(id),data TEXT NOT NULL,expires_at INTEGER NOT NULL,order_id TEXT UNIQUE REFERENCES orders(id));
      CREATE INDEX IF NOT EXISTS offer_quote_expiry ON offer_quotes(expires_at) WHERE order_id IS NULL;
      CREATE TABLE IF NOT EXISTS offer_redemptions(order_id TEXT PRIMARY KEY REFERENCES orders(id),code_id TEXT NOT NULL REFERENCES offer_codes(id),user_id TEXT NOT NULL REFERENCES users(id),referrer_id TEXT REFERENCES users(id),snapshot TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS offer_redemption_limits ON offer_redemptions(code_id,user_id);
      CREATE INDEX IF NOT EXISTS offer_referral_owner ON offer_redemptions(referrer_id);
      CREATE TABLE IF NOT EXISTS order_actual_costs(order_id TEXT PRIMARY KEY REFERENCES orders(id),revision INTEGER NOT NULL,data TEXT NOT NULL,updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS order_actual_cost_history(order_id TEXT NOT NULL REFERENCES orders(id),revision INTEGER NOT NULL,data TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(order_id,revision));`);
    const now = clock();
    store.db.prepare("INSERT OR IGNORE INTO offer_policy VALUES(1,?)").run(
      JSON.stringify({
        discountType: "percent",
        value: 500,
        maxDiscountMinor: 1_000_000,
        minSubtotalMinor: 0,
        startsAt: now,
        expiresAt: now + 365 * DAY,
        maxUses: 1000,
        perAccountLimit: 1,
        enabled: false,
        revision: 0,
      } satisfies OfferRule),
    );
    store.orderOffers = this;
  }
  private tx<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const v = fn();
      this.store.db.exec("COMMIT");
      return v;
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
        action,
        id,
        new Date(this.clock()).toISOString(),
      );
  }
  private maker(user: string) {
    if (
      this.store.db.prepare("SELECT role FROM users WHERE id=?").get(user)
        ?.role !== "maker"
    )
      throw new DomainError("Offer account required", 403);
  }
  private uuid(value: unknown) {
    if (
      typeof value !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        value,
      )
    )
      throw new DomainError("Invalid offer reference");
    return value;
  }
  private code(value: unknown) {
    if (typeof value !== "string" || !value.trim() || value.length > 24)
      throw new DomainError("Invalid offer code");
    const c = value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{3,23}$/.test(c))
      throw new DomainError("Invalid offer code");
    return c;
  }
  policy(): OfferRule {
    return JSON.parse(
      String(
        this.store.db.prepare("SELECT data FROM offer_policy WHERE id=1").get()!
          .data,
      ),
    );
  }
  private rule(input: Record<string, unknown>, referral = false): OfferRule {
    if (
      !input ||
      Object.keys(input).sort().join(",") !==
        "discountType,enabled,expiresAt,maxDiscountMinor,maxUses,minSubtotalMinor,perAccountLimit,revision,startsAt,value" ||
      typeof input.discountType !== "string" ||
      !["fixed", "percent"].includes(input.discountType) ||
      typeof input.enabled !== "boolean" ||
      ![
        "value",
        "maxDiscountMinor",
        "minSubtotalMinor",
        "startsAt",
        "expiresAt",
        "maxUses",
        "perAccountLimit",
        "revision",
      ].every((k) => Number.isSafeInteger(input[k]) && Number(input[k]) >= 0) ||
      Number(input.value) < (referral ? 0 : 1) ||
      Number(input.value) >
        (input.discountType === "percent" ? 9500 : 100_000_000) ||
      Number(input.maxDiscountMinor) < 1 ||
      Number(input.maxDiscountMinor) > 100_000_000 ||
      Number(input.minSubtotalMinor) > 1_000_000_000 ||
      Number(input.maxUses) < 1 ||
      Number(input.maxUses) > 100000 ||
      Number(input.perAccountLimit) < 1 ||
      Number(input.perAccountLimit) > 10 ||
      Number(input.startsAt) >= Number(input.expiresAt) ||
      Number(input.expiresAt) > this.clock() + 366 * DAY ||
      (referral &&
        (input.discountType !== "percent" || input.perAccountLimit !== 1))
    )
      throw new DomainError("Invalid offer rule");
    return { ...input } as OfferRule;
  }
  savePolicy(actor: string, input: Record<string, unknown>) {
    const rule = this.rule(input, true);
    return this.tx(() => {
      if (this.policy().revision !== rule.revision)
        throw new DomainError("Offer changed", 409);
      const next = { ...rule, revision: rule.revision + 1 };
      this.store.db
        .prepare("UPDATE offer_policy SET data=? WHERE id=1")
        .run(JSON.stringify(next));
      this.log(actor, "offer.policy", String(next.revision));
      return next;
    });
  }
  saveCode(actor: string, input: { code?: unknown; rule?: unknown }) {
    if (!input || Object.keys(input).sort().join(",") !== "code,rule")
      throw new DomainError("Invalid offer fields");
    const code = this.code(input.code),
      rule = this.rule(input.rule as Record<string, unknown>);
    return this.tx(() => {
      const old = this.store.db
        .prepare("SELECT * FROM offer_codes WHERE code=?")
        .get(code) as CodeRow | undefined;
      if (old?.kind === "referral" || (old?.revision ?? 0) !== rule.revision)
        throw new DomainError("Offer changed", 409);
      const id = old?.id ?? randomUUID(),
        next = { ...rule, revision: rule.revision + 1 };
      this.store.db
        .prepare(
          "INSERT INTO offer_codes VALUES(?,?,'promo',NULL,?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision",
        )
        .run(id, code, JSON.stringify(next), next.revision);
      this.log(actor, "offer.save", id);
      return { id, code, kind: "promo" as const, rule: next };
    });
  }
  private effective(row: CodeRow) {
    const rule =
      row.kind === "referral"
        ? this.policy()
        : (JSON.parse(row.data) as OfferRule);
    return { rule, revision: row.revision + ":" + rule.revision };
  }
  private eligible(user: string, row: CodeRow, subtotal: number) {
    const now = this.clock(),
      { rule } = this.effective(row);
    if (
      !row.active ||
      !rule.enabled ||
      now < rule.startsAt ||
      now >= rule.expiresAt ||
      subtotal < rule.minSubtotalMinor ||
      row.owner_id === user
    )
      throw new DomainError("Offer unavailable", 409);
    const uses = this.store.db
      .prepare(
        "SELECT COUNT(*) total,SUM(CASE WHEN r.user_id=? THEN 1 ELSE 0 END) own FROM offer_redemptions r JOIN orders o ON o.id=r.order_id WHERE r.code_id=? AND o.status!='cancelled'",
      )
      .get(user, row.id)!;
    if (
      Number(uses.total) >= rule.maxUses ||
      Number(uses.own) >= rule.perAccountLimit
    )
      throw new DomainError("Offer limit reached", 409);
    if (row.kind === "referral") {
      if (
        !row.owner_id ||
        !this.store.db
          .prepare("SELECT id FROM users WHERE id=? AND role='maker'")
          .get(row.owner_id)
      )
        throw new DomainError("Offer unavailable", 409);
      const prior = this.store.db
          .prepare(
            "SELECT 1 FROM orders o WHERE o.user_id=? AND EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status='paid' AND p.amount_minor=o.total_minor AND p.amount_minor>0) LIMIT 1",
          )
          .get(user),
        reserved = this.store.db
          .prepare(
            "SELECT 1 FROM offer_redemptions r JOIN offer_codes c ON c.id=r.code_id JOIN orders o ON o.id=r.order_id WHERE r.user_id=? AND c.kind='referral' AND o.status!='cancelled' LIMIT 1",
          )
          .get(user);
      if (prior || reserved)
        throw new DomainError("Referral is for a first purchase", 409);
    }
    return rule;
  }
  private cart(items: unknown) {
    if (!Array.isArray(items) || !items.length || items.length > 20)
      throw new DomainError("Invalid offer cart");
    const seen = new Set<string>();
    const lines = items
      .map((item) => {
        if (
          !item ||
          typeof item.productId !== "string" ||
          !item.productId ||
          item.productId.length > 100 ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 10 ||
          seen.has(item.productId) ||
          Object.keys(item).sort().join(",") !== "productId,quantity"
        )
          throw new DomainError("Invalid offer cart");
        seen.add(item.productId);
        const p = this.store.db
          .prepare(
            "SELECT price_minor,credits,stock,currency FROM products WHERE id=? AND active=1",
          )
          .get(item.productId);
        if (
          !p ||
          p.currency !== "UZS" ||
          Number(p.stock) < item.quantity ||
          !Number.isSafeInteger(p.price_minor) ||
          !Number.isSafeInteger(p.credits)
        )
          throw new DomainError("Offer stock changed", 409);
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: Number(p.price_minor),
          credits: Number(p.credits),
        };
      })
      .sort((a, b) => a.productId.localeCompare(b.productId));
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.price, 0);
    this.store.inventory?.assertAvailable(
      lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    );
    if (!Number.isSafeInteger(subtotal) || subtotal < 1)
      throw new DomainError("Invalid offer total");
    return { lines, subtotal };
  }
  quote(
    user: string,
    items: unknown,
    method: unknown,
    value: unknown,
  ): OfferQuote {
    this.maker(user);
    const code = this.code(value);
    if (typeof method !== "string" || !["pickup", "courier"].includes(method))
      throw new DomainError("Invalid offer delivery");
    return this.tx(() => {
      const now = this.clock();
      this.prune(now);
      if (
        Number(
          this.store.db
            .prepare(
              "SELECT COUNT(*) n FROM offer_quotes WHERE user_id=? AND order_id IS NULL",
            )
            .get(user)!.n,
        ) >= 20
      )
        throw new DomainError("Too many offer quotes", 429);
      const row = this.store.db
        .prepare("SELECT * FROM offer_codes WHERE code=?")
        .get(code) as CodeRow | undefined;
      if (!row) throw new DomainError("Offer unavailable", 409);
      const { lines, subtotal } = this.cart(items),
        rule = this.eligible(user, row, subtotal),
        settings = new BusinessStore(this.store).settings();
      if (
        method === "courier"
          ? !settings.deliveryEnabled
          : !settings.pickupAddress.trim()
      )
        throw new DomainError("Offer delivery unavailable", 409);
      const fee = method === "courier" ? settings.deliveryFeeMinor : 0,
        desired =
          rule.discountType === "fixed"
            ? rule.value
            : Math.floor((subtotal * rule.value) / 10000),
        discount = Math.min(desired, rule.maxDiscountMinor, subtotal - 1),
        id = randomUUID(),
        revision = this.effective(row).revision;
      if (discount < 0 || (!discount && row.kind === "promo"))
        throw new DomainError("Offer unavailable", 409);
      const offer: OrderOffer = {
          version: "checkout-offer/1",
          quoteId: id,
          code,
          kind: row.kind,
          ruleRevision: revision,
          subtotalMinor: subtotal,
          discountMinor: discount,
        },
        quote: OfferQuote = {
          id,
          expiresAt: now + 5 * 60000,
          subtotalMinor: subtotal,
          feeMinor: fee,
          discountMinor: discount,
          totalMinor: subtotal + fee - discount,
          currency: "UZS",
          settingsRevision: settings.revision,
          offer,
        },
        data: QuoteData = {
          ...(this.store.inventory?.requiredRevision(lines) !== undefined
            ? { catalogRevision: this.store.inventory!.revision() }
            : {}),
          items: lines,
          method: method as "pickup" | "courier",
          ruleRevision: revision,
          quote,
          referrer: row.owner_id,
        };
      this.store.db
        .prepare("INSERT INTO offer_quotes VALUES(?,?,?,?,?,NULL)")
        .run(id, user, row.id, JSON.stringify(data), quote.expiresAt);
      return quote;
    });
  }
  resolve(
    user: string,
    items: { productId: string; quantity: number }[],
    method: "pickup" | "courier",
    settingsRevision: number,
    reference: unknown,
  ): OrderOffer {
    // Called inside Store.createOrder's write transaction. Never start a nested
    // transaction or consume quota from an unauthenticated/client-made quote.
    this.maker(user);
    const id = this.uuid(reference),
      q = this.store.db
        .prepare("SELECT * FROM offer_quotes WHERE id=? AND user_id=?")
        .get(id, user) as QuoteRow | undefined;
    if (!q || q.order_id || q.expires_at <= this.clock())
      throw new DomainError("Offer quote expired or used", 409);
    const data = JSON.parse(q.data) as QuoteData,
      row = this.store.db
        .prepare("SELECT * FROM offer_codes WHERE id=?")
        .get(q.code_id) as CodeRow | undefined;
    if (!row) throw new DomainError("Offer unavailable", 409);
    const { lines, subtotal } = this.cart(items);
    this.eligible(user, row, subtotal);
    if (
      JSON.stringify(lines) !== JSON.stringify(data.items) ||
      data.method !== method ||
      data.quote.settingsRevision !== settingsRevision ||
      data.catalogRevision !== this.store.inventory?.requiredRevision(lines) ||
      data.ruleRevision !== this.effective(row).revision
    )
      throw new DomainError("Offer quote changed", 409);
    return data.quote.offer;
  }
  attach(user: string, orderId: string, offer: OrderOffer) {
    const q = this.store.db
        .prepare("SELECT * FROM offer_quotes WHERE id=? AND user_id=?")
        .get(offer.quoteId, user) as QuoteRow | undefined,
      order = this.store.db
        .prepare("SELECT user_id,total_minor FROM orders WHERE id=?")
        .get(orderId);
    if (!q || q.order_id || !order || order.user_id !== user)
      throw new DomainError("Offer quote changed", 409);
    const data = JSON.parse(q.data) as QuoteData;
    if (
      JSON.stringify(data.quote.offer) !== JSON.stringify(offer) ||
      Number(order.total_minor) !== data.quote.totalMinor
    )
      throw new DomainError("Invalid offer total");
    this.store.db
      .prepare("UPDATE offer_quotes SET order_id=? WHERE id=?")
      .run(orderId, q.id);
    this.store.db
      .prepare("INSERT INTO offer_redemptions VALUES(?,?,?,?,?)")
      .run(orderId, q.code_id, user, data.referrer, JSON.stringify(offer));
    this.log(user, "offer.reserve", orderId);
  }
  referral(user: string, create = false) {
    this.maker(user);
    const policy = this.policy();
    let row = this.store.db
      .prepare("SELECT * FROM offer_codes WHERE kind='referral' AND owner_id=?")
      .get(user) as CodeRow | undefined;
    if (create && !row) {
      if (
        !policy.enabled ||
        this.clock() < policy.startsAt ||
        this.clock() >= policy.expiresAt
      )
        throw new DomainError("Referrals unavailable", 409);
      row = this.tx(() => {
        const existing = this.store.db
          .prepare(
            "SELECT * FROM offer_codes WHERE kind='referral' AND owner_id=?",
          )
          .get(user) as CodeRow | undefined;
        if (existing) return existing;
        const id = randomUUID(),
          code = "REF-" + randomBytes(6).toString("hex").toUpperCase();
        this.store.db
          .prepare("INSERT INTO offer_codes VALUES(?,?,'referral',?,'{}',1,1)")
          .run(id, code, user);
        this.log(user, "offer.referral-code", id);
        return this.store.db
          .prepare("SELECT * FROM offer_codes WHERE id=?")
          .get(id) as CodeRow;
      });
    }
    const counts = this.store.db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN o.status='pending' THEN 1 ELSE 0 END),0) pending,COALESCE(SUM(CASE WHEN o.status IN('paid','fulfilled','return_requested') AND o.total_minor>0 AND EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status='paid' AND p.amount_minor=o.total_minor) THEN 1 ELSE 0 END),0) qualified,COALESCE(SUM(CASE WHEN o.status='refunded' THEN 1 ELSE 0 END),0) reversed,COALESCE(SUM(CASE WHEN o.status='cancelled' THEN 1 ELSE 0 END),0) cancelled FROM offer_redemptions r JOIN orders o ON o.id=r.order_id WHERE r.referrer_id=?",
      )
      .get(user)!;
    return {
      enabled:
        policy.enabled &&
        this.clock() >= policy.startsAt &&
        this.clock() < policy.expiresAt,
      code: row?.code ?? null,
      discountBps: policy.value,
      pending: Number(counts.pending),
      qualified: Number(counts.qualified),
      reversed: Number(counts.reversed),
      cancelled: Number(counts.cancelled),
      automaticRewards: false,
    };
  }
  codes() {
    return (
      this.store.db
        .prepare(
          "SELECT * FROM offer_codes WHERE kind='promo' ORDER BY rowid DESC LIMIT 200",
        )
        .all() as CodeRow[]
    ).map((c) => ({
      id: c.id,
      code: c.code,
      kind: c.kind,
      rule: this.effective(c).rule,
    }));
  }
  prune(now = this.clock()) {
    const unused = this.store.db
        .prepare(
          "DELETE FROM offer_quotes WHERE order_id IS NULL AND expires_at<=?",
        )
        .run(now),
      used = this.store.db
        .prepare(
          "DELETE FROM offer_quotes WHERE order_id IS NOT NULL AND expires_at<=?",
        )
        .run(now - 30 * DAY);
    return { unused: Number(unused.changes), used: Number(used.changes) };
  }
  saveCosts(
    actor: string,
    orderId: unknown,
    input: { revision?: unknown; costs?: unknown },
  ) {
    const id = this.uuid(orderId),
      costs = input?.costs as OrderActualCosts;
    if (
      !input ||
      Object.keys(input).sort().join(",") !== "costs,revision" ||
      !Number.isSafeInteger(input.revision) ||
      Number(input.revision) < 0 ||
      !costs ||
      Object.keys(costs).sort().join(",") !== costKeys.join(",") ||
      !Object.values(costs).every(
        (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000_000,
      )
    )
      throw new DomainError("Invalid actual costs");
    return this.tx(() => {
      if (!this.store.db.prepare("SELECT id FROM orders WHERE id=?").get(id))
        throw new DomainError("Order not found", 404);
      const old = this.store.db
        .prepare("SELECT revision FROM order_actual_costs WHERE order_id=?")
        .get(id);
      if (Number(old?.revision ?? 0) !== input.revision)
        throw new DomainError("Actual costs changed", 409);
      const revision = Number(input.revision) + 1,
        data = JSON.stringify(costs),
        now = this.clock();
      this.store.db
        .prepare(
          "INSERT INTO order_actual_costs VALUES(?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET revision=excluded.revision,data=excluded.data,updated_at=excluded.updated_at",
        )
        .run(id, revision, data, now);
      this.store.db
        .prepare("INSERT INTO order_actual_cost_history VALUES(?,?,?,?,?)")
        .run(id, revision, data, actor, now);
      this.log(actor, "offer.actual-costs", id);
      return { orderId: id, revision, costs };
    });
  }
  report() {
    const rows = this.store.db
      .prepare(
        "SELECT o.id,o.status,o.total_minor,o.currency,r.snapshot,r.referrer_id,c.data costs,c.revision cost_revision,EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status='paid' AND p.amount_minor=o.total_minor) settled FROM orders o LEFT JOIN offer_redemptions r ON r.order_id=o.id LEFT JOIN order_actual_costs c ON c.order_id=o.id ORDER BY o.created_at DESC,o.id DESC LIMIT 200",
      )
      .all();
    return rows.map((row) => {
      const recognized =
          ["paid", "fulfilled", "return_requested"].includes(
            String(row.status),
          ) && row.settled
            ? Number(row.total_minor)
            : 0,
        costs = row.costs
          ? (JSON.parse(String(row.costs)) as OrderActualCosts)
          : null,
        offer = row.snapshot
          ? (JSON.parse(String(row.snapshot)) as OrderOffer)
          : null;
      return {
        orderId: String(row.id),
        currency: String(row.currency),
        status: String(row.status),
        totalMinor: Number(row.total_minor),
        recognizedRevenueMinor: recognized,
        discountMinor: offer?.discountMinor ?? 0,
        offerCode: offer?.code ?? null,
        referralQualified: !!row.referrer_id && recognized > 0,
        costs,
        costRevision: Number(row.cost_revision ?? 0),
        netContributionMinor: costs
          ? recognized - Object.values(costs).reduce((s, n) => s + n, 0)
          : null,
      };
    });
  }
}
