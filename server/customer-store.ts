import { BusinessStore } from "./business-store";
import {
  scryptSync,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { Store, DomainError } from "./store.ts";
import type { Progress } from "../src/core/types";
import type { OrderQuote } from "../src/offer-types";
import { isCommerceCurrency } from "../src/commerce-regions";
import type { CatalogSku } from "../src/catalog-types";
import type { OrderCommerce } from "../src/business-types";

type Account = {
  user_id: string;
  email: string;
  salt: string;
  password_hash: string;
  recovery_hash: string;
};
export class CustomerStore extends Store {
  constructor(path: string, pepper: string, paymentKey: string) {
    super(path, pepper, paymentKey);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts(user_id TEXT PRIMARY KEY REFERENCES users(id),email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,recovery_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ticket_replies(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES tickets(id),author TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS product_details(id TEXT PRIMARY KEY REFERENCES products(id),revision INTEGER NOT NULL DEFAULT 1,description TEXT NOT NULL DEFAULT '');
      INSERT OR IGNORE INTO product_details SELECT id,1,'' FROM products;
      CREATE TRIGGER IF NOT EXISTS product_stock_revision AFTER UPDATE OF stock ON products WHEN OLD.stock != NEW.stock BEGIN
        INSERT INTO product_details(id,revision,description) VALUES(NEW.id,2,'') ON CONFLICT(id) DO UPDATE SET revision=revision+1;
      END;
      INSERT OR IGNORE INTO migrations VALUES(4,datetime('now'));
    `);
  }
  private customerSavepoint = 0;
  private transaction<T>(fn: () => T): T {
    const nested = this.db.isTransaction,
      point = "customer_nested_" + ++this.customerSavepoint;
    this.db.exec(nested ? "SAVEPOINT " + point : "BEGIN IMMEDIATE");
    try {
      const v = fn();
      this.db.exec(nested ? "RELEASE SAVEPOINT " + point : "COMMIT");
      return v;
    } catch (e) {
      if (nested) {
        this.db.exec("ROLLBACK TO SAVEPOINT " + point);
        this.db.exec("RELEASE SAVEPOINT " + point);
      } else this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private log(actor: string, action: string, entity: string) {
    this.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, entity, new Date().toISOString());
  }
  private email(value: unknown): string {
    if (
      typeof value !== "string" ||
      value.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    )
      throw new DomainError("Invalid email");
    return value.trim().toLowerCase();
  }
  private password(value: unknown): string {
    if (typeof value !== "string" || value.length < 12 || value.length > 256)
      throw new DomainError("Password must contain 12–256 characters");
    return value;
  }
  private session(user: string) {
    const token = randomBytes(32).toString("base64url");
    this.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(this.digest(token), user, Date.now() + 7 * 86400000);
    return { id: user, token };
  }
  register(user: string, email: unknown, password: unknown) {
    const normalized = this.email(email),
      secret = this.password(password);
    const salt = randomBytes(16).toString("hex"),
      recoveryKey = randomBytes(32).toString("base64url");
    const hash = scryptSync(secret, salt, 64).toString("hex");
    return this.transaction(() => {
      if (
        this.db
          .prepare("SELECT 1 FROM accounts WHERE email=? OR user_id=?")
          .get(normalized, user)
      )
        throw new DomainError("Account already exists", 409);
      this.db
        .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
        .run(user, normalized, salt, hash, this.digest(recoveryKey));
      this.db.prepare("UPDATE users SET role='maker' WHERE id=?").run(user);
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(user);
      this.log(user, "account.register", user);
      return { ...this.session(user), email: normalized, recoveryKey };
    });
  }
  login(email: unknown, password: unknown) {
    const normalized = this.email(email),
      secret = this.password(password);
    const account = this.db
      .prepare("SELECT * FROM accounts WHERE email=?")
      .get(normalized) as Account | undefined;
    // Equal-cost derivation also for an unknown account; no password or token logging.
    const candidate = scryptSync(
      secret,
      account?.salt ?? "unknown-account-salt",
      64,
    );
    if (
      !account ||
      !timingSafeEqual(candidate, Buffer.from(account.password_hash, "hex"))
    )
      throw new DomainError("Email or password incorrect", 401);
    return { ...this.session(account.user_id), email: account.email };
  }
  recover(email: unknown, key: unknown, password: unknown) {
    const normalized = this.email(email),
      secret = this.password(password);
    if (typeof key !== "string" || key.length > 200)
      throw new DomainError("Recovery unavailable", 401);
    const a = this.db
      .prepare("SELECT * FROM accounts WHERE email=?")
      .get(normalized) as Account | undefined;
    const hash = this.digest(key);
    if (!a || !timingSafeEqual(Buffer.from(hash), Buffer.from(a.recovery_hash)))
      throw new DomainError("Recovery unavailable", 401);
    const salt = randomBytes(16).toString("hex"),
      recoveryKey = randomBytes(32).toString("base64url");
    const derived = scryptSync(secret, salt, 64).toString("hex");
    return this.transaction(() => {
      this.db
        .prepare(
          "UPDATE accounts SET salt=?,password_hash=?,recovery_hash=? WHERE user_id=?",
        )
        .run(salt, derived, this.digest(recoveryKey), a.user_id);
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(a.user_id);
      this.log(a.user_id, "account.recover", a.user_id);
      return { ...this.session(a.user_id), email: a.email, recoveryKey };
    });
  }
  logout(token: string) {
    this.db
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .run(this.digest(token));
    return { loggedOut: true };
  }
  customer(user: string) {
    const account = this.db
      .prepare("SELECT email FROM accounts WHERE user_id=?")
      .get(user) as { email: string } | undefined;
    return {
      id: user,
      email: account?.email ?? null,
      credits: this.balance(user),
      sandbox: true,
    };
  }
  override catalog() {
    const rows = this.db
      .prepare(
        "SELECT p.*,COALESCE(d.revision,1) AS revision,COALESCE(d.description,'') AS description FROM products p LEFT JOIN product_details d ON d.id=p.id WHERE p.active=1",
      )
      .all();
    return rows
      .filter((row) => this.inventory?.sku(String(row.id))?.sellable !== false)
      .map((row) => {
        row.stock =
          this.inventory?.available(String(row.id)) ?? Number(row.stock);
        return row;
      });
  }
  products() {
    return this.db
      .prepare(
        "SELECT p.*,COALESCE(d.revision,1) AS revision,COALESCE(d.description,'') AS description FROM products p LEFT JOIN product_details d ON d.id=p.id ORDER BY p.name",
      )
      .all();
  }
  updateProduct(
    actor: string,
    p: Record<string, unknown>,
    skuKind?: CatalogSku["kind"],
  ) {
    const {
      id,
      name,
      family,
      price_minor,
      stock,
      credits,
      description,
      expectedRevision,
      active,
      profile_id,
    } = p;
    if (
      typeof id !== "string" ||
      !/^[a-z0-9-]{2,80}$/.test(id) ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 120 ||
      ![
        "string",
        "brick",
        "diamond",
        "paint",
        "book",
        "guided",
        "digital",
      ].includes(String(family)) ||
      typeof description !== "string" ||
      description.length > 2000 ||
      ![price_minor, stock, credits, expectedRevision].every(
        (v) => Number.isSafeInteger(v) && Number(v) >= 0,
      ) ||
      Number(stock) > 100000 ||
      Number(credits) > 100 ||
      Number(price_minor) > 100000000 ||
      ![0, 1].includes(Number(active)) ||
      typeof profile_id !== "string" ||
      profile_id.length > 100 ||
      (p.currency !== undefined && !isCommerceCurrency(p.currency))
    )
      throw new DomainError("Invalid product");
    return this.transaction(() => {
      const existing = this.db
        .prepare("SELECT currency FROM products WHERE id=?")
        .get(id);
      if (
        (skuKind ?? this.inventory?.sku(id)?.kind) === "refill" &&
        Number(credits) !== 0
      )
        throw new DomainError("Refills cannot silently grant build credits");
      const revision = existing
        ? Number(
            (
              this.db
                .prepare("SELECT revision FROM product_details WHERE id=?")
                .get(id) as { revision: number } | undefined
            )?.revision ?? 1,
          )
        : 0;
      if (revision !== expectedRevision)
        throw new DomainError("Product changed; reload before updating", 409);
      this.db
        .prepare(
          "INSERT INTO products VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,family=excluded.family,price_minor=excluded.price_minor,currency=excluded.currency,profile_id=excluded.profile_id,stock=excluded.stock,credits=excluded.credits,active=excluded.active",
        )
        .run(
          id,
          name.trim(),
          String(family),
          Number(price_minor),
          (p.currency as string) ?? existing?.currency ?? "UZS",
          profile_id,
          Number(stock),
          Number(credits),
          1,
          Number(active),
        );
      this.db
        .prepare(
          "INSERT INTO product_details VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,description=excluded.description",
        )
        .run(id, revision + 1, description);
      this.inventory?.productChanged(id);
      this.log(actor, "product.update", id);
      return this.products().find((row) => row.id === id);
    });
  }
  orders(user?: string) {
    const rows = user
      ? this.db
          .prepare(
            "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC",
          )
          .all(user)
      : this.db
          .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200")
          .all();
    return rows.map((o) => ({
      ...o,
      id: String(o.id),
      status: String(o.status),
      total_minor: Number(o.total_minor),
      address: JSON.parse(String(o.address)),
      commerce: (() => {
        const row = this.db
          .prepare("SELECT data FROM order_commerce WHERE order_id=?")
          .get(o.id);
        return row ? JSON.parse(String(row.data)) : null;
      })(),
      items: this.db
        .prepare(
          "SELECT l.*,p.name FROM order_lines l JOIN products p ON p.id=l.product_id WHERE order_id=?",
        )
        .all(o.id)
        .map((line) => {
          const snapshot = this.inventory
            ?.snapshot("order:" + o.id)
            ?.find((s) => s.productId === line.product_id);
          return snapshot
            ? {
                ...line,
                product_id: line.product_id,
                order_id: line.order_id,
                quantity: line.quantity,
                unit_price_minor: line.unit_price_minor,
                credits: line.credits,
                name: snapshot.name,
                sku: snapshot.sku,
                profile_id: snapshot.profileId,
              }
            : line;
        }),
      fulfillments: this.db
        .prepare("SELECT tracking,state FROM fulfillments WHERE order_id=?")
        .all(o.id),
    }));
  }
  override createOrder(
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
  ) {
    if (address?.deliveryMethod !== undefined)
      return this.submitOrder(user, items, address, key);
    return super.createOrder(user, items, address, key);
  }
  submitOrder(
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
    quote?: OrderQuote,
  ) {
    if (
      !address ||
      !["courier", "pickup"].includes(address.deliveryMethod ?? "") ||
      typeof address.phone !== "string" ||
      !/^\+?[\d ()-]{7,40}$/.test(address.phone) ||
      !/^\d{7,15}$/.test(address.phone.replace(/\D/g, "")) ||
      ![address.name].every(
        (v) => typeof v === "string" && v.trim().length >= 2 && v.length <= 200,
      ) ||
      (address.deliveryMethod === "courier" &&
        ![address.city, address.street].every(
          (v) =>
            typeof v === "string" && v.trim().length >= 2 && v.length <= 200,
        ))
    )
      throw new DomainError("Invalid delivery details");
    return super.createOrder(
      user,
      items,
      address,
      key,
      () => {
        const config = new BusinessStore(this).settings();
        const shipping = this.regions?.quote(
          items,
          address.country ?? "UZ",
          address.deliveryMethod,
          quote?.shippingRevision,
        );
        if (
          !shipping &&
          address.country !== undefined &&
          address.country !== "UZ"
        )
          throw new DomainError("Unsupported destination", 409);
        if (
          !shipping &&
          address.deliveryMethod === "courier" &&
          !config.deliveryEnabled
        )
          throw new DomainError("Delivery unavailable", 409);
        if (
          !shipping &&
          address.deliveryMethod === "pickup" &&
          !config.pickupAddress.trim()
        )
          throw new DomainError("Pickup unavailable", 409);
        return {
          ...(shipping &&
          (shipping.shippingRevision > 0 ||
            quote?.shippingRevision !== undefined ||
            quote?.currency !== undefined)
            ? {
                country: shipping.country,
                currency: shipping.currency,
                shippingRevision: shipping.shippingRevision,
              }
            : {}),
          method: address.deliveryMethod as "courier" | "pickup",
          feeMinor:
            shipping?.feeMinor ??
            (address.deliveryMethod === "courier"
              ? config.deliveryFeeMinor
              : 0),
          sellerName: config.sellerName,
          sellerPhone: config.sellerPhone,
          paymentDetails: config.paymentDetails,
          pickupAddress: shipping?.pickupAddress ?? config.pickupAddress,
          settingsRevision: config.revision,
          ...(quote?.offerQuoteId
            ? {
                offer: (() => {
                  if (!this.orderOffers)
                    throw new DomainError("Offers unavailable", 409);
                  // Existing offer quotes bind the legacy UZS shipping policy.
                  // Never silently apply them to a different regional fee.
                  if (
                    shipping &&
                    (shipping.currency !== "UZS" ||
                      shipping.country !== "UZ" ||
                      shipping.feeMinor !==
                        (address.deliveryMethod === "courier"
                          ? config.deliveryFeeMinor
                          : 0))
                  )
                    throw new DomainError(
                      "Offers unavailable for this shipping region",
                      409,
                    );
                  return this.orderOffers.resolve(
                    user,
                    items,
                    address.deliveryMethod as "courier" | "pickup",
                    config.revision,
                    quote.offerQuoteId,
                  );
                })(),
              }
            : {}),
        };
      },
      quote,
    );
  }
  createDigitalOrder(
    user: string,
    productId: string,
    name: string,
    key: string,
    quote: OrderQuote,
  ) {
    return super.createOrder(
      user,
      [{ productId, quantity: 1 }],
      { name, city: "", street: "", deliveryMethod: "online" },
      key,
      () => {
        const b = new BusinessStore(this).settings();
        return {
          method: "online",
          feeMinor: 0,
          currency: quote.currency,
          sellerName: b.sellerName,
          sellerPhone: b.sellerPhone,
          paymentDetails: b.paymentDetails,
          pickupAddress: "",
          settingsRevision: b.revision,
        } satisfies OrderCommerce;
      },
      quote,
    );
  }
  requestReturn(user: string, id: string) {
    return this.transaction(() => {
      const o = this.order(user, id);
      if (o.status === "return_requested") return o;
      if (!["paid", "fulfilled"].includes(o.status))
        throw new DomainError(
          "Only paid or fulfilled orders can be returned",
          409,
        );
      this.db
        .prepare("UPDATE orders SET status='return_requested' WHERE id=?")
        .run(id);
      this.log(user, "order.return-request", id);
      return this.order(user, id);
    });
  }
  recordTestPayment(id: string, actor = "local-admin") {
    const o = this.db.prepare("SELECT * FROM orders WHERE id=?").get(id) as
      { status: string; total_minor: number; currency: string } | undefined;
    if (!o) throw new DomainError("Order not found", 404);
    if (["paid", "fulfilled", "return_requested"].includes(o.status))
      return { sandbox: true, duplicate: true };
    if (o.status !== "pending")
      throw new DomainError("Order cannot receive a test payment", 409);
    const raw = JSON.stringify({
      eventId: `admin-test-${id}`,
      orderId: id,
      amountMinor: o.total_minor,
      currency: o.currency,
      status: "paid",
      timestamp: Date.now(),
    });
    const result = this.payment(raw, this.signSandbox(raw));
    this.log(actor, "order.test-payment", id);
    return result;
  }
  refund(actor: string, id: string) {
    return this.transaction(() => {
      const o = this.db.prepare("SELECT * FROM orders WHERE id=?").get(id) as
        { status: string; user_id: string } | undefined;
      if (!o) throw new DomainError("Order not found", 404);
      if (o.status === "refunded") return this.order(o.user_id, id);
      if (o.status !== "return_requested")
        throw new DomainError("Return request required", 409);
      this.orderLifecycle?.beforeRefund(id);
      const lines = this.db
        .prepare(
          "SELECT product_id,quantity,credits FROM order_lines WHERE order_id=?",
        )
        .all(id);
      const credits = lines.reduce(
        (sum, l) => sum + Number(l.quantity) * Number(l.credits),
        0,
      );
      if (this.balance(o.user_id) < credits)
        throw new DomainError(
          "Order credits already spent; manual resolution required",
          409,
        );
      if (credits)
        this.db
          .prepare("INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)")
          .run(
            randomUUID(),
            o.user_id,
            -credits,
            "sandbox-refund",
            `order-refund:${id}`,
            new Date().toISOString(),
          );
      for (const l of lines)
        this.db
          .prepare("UPDATE products SET stock=stock+? WHERE id=?")
          .run(l.quantity, l.product_id);
      this.inventory?.restore("order:" + id);
      this.db.prepare("UPDATE orders SET status='refunded' WHERE id=?").run(id);
      this.log(actor, "order.refund-sandbox", id);
      return this.order(o.user_id, id);
    });
  }
  fulfill(actor: string, id: string, tracking: unknown) {
    if (
      typeof tracking !== "string" ||
      tracking.trim().length < 2 ||
      tracking.length > 200
    )
      throw new DomainError("Invalid tracking reference");
    return this.transaction(() => {
      const o = this.db.prepare("SELECT * FROM orders WHERE id=?").get(id) as
        { status: string; user_id: string } | undefined;
      if (!o) throw new DomainError("Order not found", 404);
      if (o.status !== "paid")
        throw new DomainError("Only paid orders can be fulfilled", 409);
      const commerce = this.db
        .prepare("SELECT data FROM order_commerce WHERE order_id=?")
        .get(id);
      if (commerce && JSON.parse(String(commerce.data)).method === "online")
        throw new DomainError(
          "This order is delivered in the app; no physical shipment",
          409,
        );
      this.db
        .prepare("INSERT INTO fulfillments VALUES(?,?,?,'recorded')")
        .run(randomUUID(), id, tracking.trim());
      this.db
        .prepare("UPDATE orders SET status='fulfilled' WHERE id=?")
        .run(id);
      this.log(actor, "order.fulfill-sandbox", id);
      return this.order(o.user_id, id);
    });
  }
  tickets(user?: string) {
    const rows = user
      ? this.db
          .prepare(
            "SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC",
          )
          .all(user)
      : this.db
          .prepare("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 200")
          .all();
    return rows.map((row) => ({
      ...row,
      replies: this.db
        .prepare(
          "SELECT id,body,created_at FROM ticket_replies WHERE ticket_id=? ORDER BY created_at",
        )
        .all(row.id),
    }));
  }
  reply(actor: string, id: string, body: unknown, state: unknown) {
    if (
      typeof body !== "string" ||
      !body.trim() ||
      body.length > 4000 ||
      !["open", "answered", "closed"].includes(String(state))
    )
      throw new DomainError("Invalid support reply");
    return this.transaction(() => {
      if (!this.db.prepare("SELECT 1 FROM tickets WHERE id=?").get(id))
        throw new DomainError("Ticket not found", 404);
      this.db
        .prepare("INSERT INTO ticket_replies VALUES(?,?,?,?,?)")
        .run(randomUUID(), id, actor, body.trim(), new Date().toISOString());
      this.db
        .prepare("UPDATE tickets SET state=? WHERE id=?")
        .run(String(state), id);
      this.log(actor, "ticket.reply", id);
      return { id, state };
    });
  }
  instructions(user: string) {
    return this.db
      .prepare(
        "SELECT i.id,i.sequence_hash,i.created_at,p.name FROM instructions i JOIN projects p ON p.id=i.project_id WHERE p.user_id=? AND p.deleted_at IS NULL ORDER BY i.created_at DESC",
      )
      .all(user);
  }
  progress(user: string, id: string): Progress {
    const i = this.instruction(user, id);
    const row = this.db
      .prepare("SELECT * FROM progress WHERE instruction_id=? AND user_id=?")
      .get(id, user);
    return {
      sequenceHash: i.sequenceHash,
      confirmed: Number(row?.confirmed ?? 0),
      revision: Number(row?.revision ?? 0),
      updatedAt: String(row?.updated_at ?? i.createdAt),
    };
  }
  auditHistory() {
    return this.db
      .prepare("SELECT * FROM audit ORDER BY created_at DESC LIMIT 200")
      .all();
  }
  codes() {
    return this.db
      .prepare(
        "SELECT hash,profile_id,quota,expires_at,revoked,redeemed_by FROM codes ORDER BY expires_at DESC LIMIT 200",
      )
      .all();
  }
  revokeHash(actor: string, hash: string) {
    if (!/^[a-f0-9]{64}$/.test(hash))
      throw new DomainError("Invalid code identifier");
    if (!this.db.prepare("SELECT 1 FROM codes WHERE hash=?").get(hash))
      throw new DomainError("Code not found", 404);
    this.db.prepare("UPDATE codes SET revoked=1 WHERE hash=?").run(hash);
    this.log(actor, "code.revoke", hash);
    return { revoked: true };
  }
}
