import { randomUUID } from "node:crypto";
import type { KitStore } from "./kit-store";
import { DomainError } from "./store";
import type {
  CatalogSku,
  CatalogItemSnapshot,
  CatalogInventory,
} from "../src/catalog-types";
type Item = { productId: string; quantity: number };
type Product = {
  id: string;
  name: string;
  profile_id: string;
  price_minor: number;
  currency: string;
  stock: number;
  credits: number;
  active: number;
};
type Reservation = {
  version: "catalog-stock/1";
  extra: Item[];
  items: CatalogItemSnapshot[];
};
export class CatalogStore implements CatalogInventory {
  constructor(private store: KitStore) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS catalog_state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);
      INSERT OR IGNORE INTO catalog_state VALUES(1,0);
      CREATE TABLE IF NOT EXISTS catalog_skus(product_id TEXT PRIMARY KEY REFERENCES products(id),revision INTEGER NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS catalog_reservations(scope TEXT PRIMARY KEY,data TEXT NOT NULL,restored INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);`);
    store.inventory = this;
  }
  private tx<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      this.store.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  revision() {
    return Number(
      this.store.db
        .prepare("SELECT revision FROM catalog_state WHERE id=1")
        .get()!.revision,
    );
  }
  sku(id: string): CatalogSku | null {
    const r = this.store.db
      .prepare("SELECT data FROM catalog_skus WHERE product_id=?")
      .get(id);
    return r ? JSON.parse(String(r.data)) : null;
  }
  all() {
    return (
      this.store.db
        .prepare("SELECT data FROM catalog_skus ORDER BY product_id LIMIT 1000")
        .all() as { data: string }[]
    ).map((r) => JSON.parse(r.data) as CatalogSku);
  }
  private product(id: string) {
    const p = this.store.db
      .prepare("SELECT * FROM products WHERE id=?")
      .get(id) as Product | undefined;
    if (!p) throw new DomainError("Catalog product not found", 404);
    return p;
  }
  private id(v: unknown) {
    if (typeof v !== "string" || !/^[a-z0-9-]{2,80}$/.test(v))
      throw new DomainError("Invalid SKU identifier");
    return v;
  }
  private text(v: unknown, max: number, empty = false) {
    if (
      typeof v !== "string" ||
      v.length > max ||
      (!empty && !v.trim()) ||
      /[\x00-\x1f\x7f]/.test(v)
    )
      throw new DomainError("Invalid SKU text");
    return v.trim();
  }
  private exact(v: unknown, keys: string) {
    if (!v || typeof v !== "object" || Object.keys(v).sort().join(",") !== keys)
      throw new DomainError("Invalid SKU fields");
  }
  private validate(v: unknown): CatalogSku {
    this.exact(
      v,
      "group,kind,label,material,parts,productId,revision,sellable,version",
    );
    const s = v as CatalogSku;
    if (
      s.version !== "catalog-sku/1" ||
      typeof s.kind !== "string" ||
      !["kit", "variant", "refill", "bundle"].includes(s.kind) ||
      typeof s.sellable !== "boolean" ||
      !Number.isSafeInteger(s.revision) ||
      s.revision < 0 ||
      !Array.isArray(s.parts) ||
      s.parts.length > 10
    )
      throw new DomainError("Invalid SKU specification");
    const seen = new Set<string>();
    for (const p of s.parts) {
      this.exact(p, "productId,quantity");
      this.id(p.productId);
      if (
        seen.has(p.productId) ||
        !Number.isSafeInteger(p.quantity) ||
        p.quantity < 1 ||
        p.quantity > 100
      )
        throw new DomainError("Invalid SKU component");
      seen.add(p.productId);
    }
    if (
      ((s.kind === "kit" || s.kind === "refill") && s.parts.length) ||
      (s.kind === "variant" &&
        (s.parts.length !== 1 || s.parts[0].quantity !== 1)) ||
      (s.kind === "bundle" &&
        (!s.parts.length || s.parts.reduce((n, p) => n + p.quantity, 0) < 2))
    )
      throw new DomainError("Invalid SKU composition");
    return {
      ...s,
      productId: this.id(s.productId),
      group: this.text(s.group, 80, true),
      label: this.text(s.label, 80),
      material: this.text(s.material, 160),
      parts: s.parts.map((p) => ({ ...p })),
    };
  }
  save(actor: string, input: { product?: unknown; sku?: unknown }) {
    this.exact(input, "product,sku");
    const s = this.validate(input.sku),
      product = input.product as Record<string, unknown>;
    if (!product || product.id !== s.productId)
      throw new DomainError("SKU product mismatch");
    if (
      Object.keys(product).some(
        (k) =>
          ![
            "id",
            "name",
            "family",
            "price_minor",
            "stock",
            "credits",
            "description",
            "expectedRevision",
            "active",
            "profile_id",
            "currency",
          ].includes(k),
      ) ||
      typeof product.family !== "string" ||
      typeof product.active !== "number" ||
      (product.currency !== undefined &&
        (typeof product.currency !== "string" ||
          !["UZS", "USD", "RUB"].includes(product.currency)))
    )
      throw new DomainError("Invalid SKU product fields");
    return this.tx(() => {
      const old = this.sku(s.productId);
      if ((old?.revision ?? 0) !== s.revision)
        throw new DomainError("SKU changed", 409);
      if (
        !old &&
        Number(
          this.store.db.prepare("SELECT COUNT(*) n FROM catalog_skus").get()!.n,
        ) >= 1000
      )
        throw new DomainError("Catalog SKU limit", 409);
      this.store.updateProduct(actor, product);
      const p = this.product(s.productId);
      if (s.kind === "refill" && p.credits !== 0)
        throw new DomainError("Refills cannot silently grant build credits");
      const next = { ...s, revision: s.revision + 1 };
      this.store.db
        .prepare(
          "INSERT INTO catalog_skus VALUES(?,?,?) ON CONFLICT(product_id) DO UPDATE SET revision=excluded.revision,data=excluded.data",
        )
        .run(s.productId, next.revision, JSON.stringify(next));
      for (const candidate of this.all())
        this.expansion(
          [{ productId: candidate.productId, quantity: 1 }],
          false,
        );
      this.store.db
        .prepare("UPDATE catalog_state SET revision=revision+1 WHERE id=1")
        .run();
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          actor,
          "catalog.sku",
          s.productId,
          new Date().toISOString(),
        );
      return {
        sku: next,
        revision: this.revision(),
        product: this.store.products().find((p) => p.id === s.productId),
      };
    });
  }
  private expansion(items: Item[], requireActive = true) {
    if (!Array.isArray(items) || !items.length || items.length > 20)
      throw new DomainError("Invalid SKU cart");
    const counts = new Map<string, number>(),
      seenRoots = new Set<string>();
    let visits = 0;
    const add = (id: string, n: number, path: string[]) => {
      if (path.includes(id) || path.length > 4 || ++visits > 200)
        throw new DomainError("SKU component cycle or depth limit");
      const p = this.product(id);
      if (requireActive && p.active !== 1)
        throw new DomainError("SKU component unavailable", 409);
      const total = (counts.get(id) ?? 0) + n;
      if (!Number.isSafeInteger(total) || total > 1_000_000)
        throw new DomainError("SKU quantity limit");
      counts.set(id, total);
      for (const part of this.sku(id)?.parts ?? [])
        add(part.productId, n * part.quantity, [...path, id]);
    };
    for (const item of items) {
      this.id(item.productId);
      if (
        seenRoots.has(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100
      )
        throw new DomainError("Invalid SKU quantity");
      seenRoots.add(item.productId);
      add(item.productId, item.quantity, []);
    }
    return counts;
  }
  available(id: string) {
    try {
      const plan = this.expansion([{ productId: id, quantity: 1 }]);
      return Math.max(
        0,
        Math.min(
          ...[...plan].map(([id, n]) => Math.floor(this.product(id).stock / n)),
        ),
      );
    } catch (e) {
      if (e instanceof DomainError && [404, 409].includes(e.status)) return 0;
      throw e;
    }
  }
  requiredRevision(items: Item[]) {
    return items.some((i) => this.sku(i.productId))
      ? this.revision()
      : undefined;
  }
  assertAvailable(items: Item[]) {
    for (const [id, n] of this.expansion(items))
      if (this.product(id).stock < n)
        throw new DomainError("SKU component stock unavailable", 409);
  }
  assertOrder(items: Item[], revision: number | undefined) {
    const required = this.requiredRevision(items);
    if (required !== undefined && required !== revision)
      throw new DomainError("Catalog changed; review the exact SKU", 409);
    if (items.some((i) => this.sku(i.productId)?.sellable === false))
      throw new DomainError("Warehouse SKU is not sold separately", 409);
    this.assertAvailable(items);
  }
  private scope(scope: string) {
    if (
      !/^(order|partner):[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        scope,
      ) ||
      !this.store.db.isTransaction
    )
      throw new DomainError("Inventory requires its owning transaction");
    const [kind, id] = scope.split(":");
    if (
      !this.store.db
        .prepare(
          kind === "order"
            ? "SELECT id FROM orders WHERE id=?"
            : "SELECT id FROM partner_campaigns WHERE id=?",
        )
        .get(id)
    )
      throw new DomainError("Inventory scope unavailable", 409);
  }
  reserve(scope: string, items: Item[]) {
    if (this.requiredRevision(items) === undefined) return;
    this.scope(scope);
    if (
      this.store.db
        .prepare("SELECT scope FROM catalog_reservations WHERE scope=?")
        .get(scope)
    )
      throw new DomainError("Inventory already reserved", 409);
    const plan = this.expansion(items),
      direct = new Map(items.map((i) => [i.productId, i.quantity]));
    const extra = [...plan]
      .map(([productId, n]) => ({
        productId,
        quantity: n - (direct.get(productId) ?? 0),
      }))
      .filter((p) => p.quantity > 0);
    for (const part of extra) {
      const changed = this.store.db
        .prepare(
          "UPDATE products SET stock=stock-? WHERE id=? AND active=1 AND stock>=?",
        )
        .run(part.quantity, part.productId, part.quantity);
      if (Number(changed.changes) !== 1)
        throw new DomainError("SKU component stock unavailable", 409);
    }
    const snapshot: Reservation = {
      version: "catalog-stock/1",
      extra,
      items: items.map((item) => {
        const p = this.product(item.productId);
        return {
          ...item,
          name: p.name,
          priceMinor: p.price_minor,
          currency: p.currency,
          profileId: p.profile_id ?? "",
          credits: p.credits,
          sku: this.sku(p.id),
        };
      }),
    };
    this.store.db
      .prepare("INSERT INTO catalog_reservations VALUES(?,?,0,?)")
      .run(scope, JSON.stringify(snapshot), Date.now());
  }
  restore(scope: string) {
    const row = this.store.db
      .prepare("SELECT data,restored FROM catalog_reservations WHERE scope=?")
      .get(scope);
    if (!row || row.restored) return;
    this.scope(scope);
    const saved = JSON.parse(String(row.data)) as Reservation;
    for (const part of saved.extra)
      this.store.db
        .prepare("UPDATE products SET stock=stock+? WHERE id=?")
        .run(part.quantity, part.productId);
    this.store.db
      .prepare("UPDATE catalog_reservations SET restored=1 WHERE scope=?")
      .run(scope);
  }
  snapshot(scope: string) {
    const row = this.store.db
      .prepare("SELECT data FROM catalog_reservations WHERE scope=?")
      .get(scope);
    return row
      ? (JSON.parse(String(row.data)) as Reservation).items
      : undefined;
  }
}
