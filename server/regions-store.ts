import { randomUUID } from "node:crypto";
import type { CustomerStore } from "./customer-store";
import { BusinessStore } from "./business-store";
import { DomainError } from "./store";
import {
  isCommerceCountry,
  isCommerceCurrency,
  type CommerceRegion,
  type CommerceRegions,
  type RegionalCommerce,
  type ShippingSnapshot,
} from "../src/commerce-regions";
export class RegionsStore implements RegionalCommerce {
  constructor(private store: CustomerStore) {
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS commerce_regions(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL);INSERT OR IGNORE INTO commerce_regions VALUES(1,0,'[]');",
    );
    store.regions = this;
  }
  policy(): CommerceRegions {
    const row = this.store.db
        .prepare("SELECT revision,data FROM commerce_regions WHERE id=1")
        .get()!,
      regions = JSON.parse(String(row.data)) as CommerceRegion[],
      b = new BusinessStore(this.store).settings();
    return {
      version: "commerce-regions/1",
      revision: Number(row.revision),
      usesLegacy: regions.length === 0,
      regions: regions.length
        ? regions
        : [
            {
              country: "UZ",
              currency: "UZS",
              enabled: true,
              pickupAddress: b.pickupAddress,
              courierEnabled: b.deliveryEnabled,
              courierFeeMinor: b.deliveryFeeMinor,
            },
          ],
    };
  }
  save(actor: string, input: { revision?: unknown; regions?: unknown }) {
    if (
      !input ||
      Object.keys(input).sort().join(",") !== "regions,revision" ||
      !Number.isSafeInteger(input.revision) ||
      Number(input.revision) < 0 ||
      !Array.isArray(input.regions) ||
      input.regions.length > 8
    )
      throw new DomainError("Invalid regional configuration");
    const seen = new Set<string>(),
      regions: CommerceRegion[] = [];
    for (const row of input.regions) {
      if (
        !row ||
        Object.keys(row).sort().join(",") !==
          "country,courierEnabled,courierFeeMinor,currency,enabled,pickupAddress" ||
        !isCommerceCountry(row.country) ||
        !isCommerceCurrency(row.currency) ||
        seen.has(row.country) ||
        typeof row.enabled !== "boolean" ||
        typeof row.courierEnabled !== "boolean" ||
        typeof row.pickupAddress !== "string" ||
        row.pickupAddress.length > 300 ||
        /[\x00-\x1f\x7f]/.test(row.pickupAddress) ||
        !Number.isSafeInteger(row.courierFeeMinor) ||
        row.courierFeeMinor < 0 ||
        row.courierFeeMinor > 100000000
      )
        throw new DomainError("Invalid regional rule");
      seen.add(row.country);
      regions.push({ ...row, pickupAddress: row.pickupAddress.trim() });
    }
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      if (this.policy().revision !== input.revision)
        throw new DomainError("Regions changed", 409);
      this.store.db
        .prepare(
          "UPDATE commerce_regions SET revision=revision+1,data=? WHERE id=1",
        )
        .run(JSON.stringify(regions));
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          actor,
          "commerce.regions",
          "regions",
          new Date().toISOString(),
        );
      this.store.db.exec("COMMIT");
      return this.policy();
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  quote(
    items: { productId: string; quantity: number }[],
    country: unknown,
    method: unknown,
    revision?: number,
  ): ShippingSnapshot {
    if (
      !isCommerceCountry(country) ||
      typeof method !== "string" ||
      !["pickup", "courier"].includes(method)
    )
      throw new DomainError("Unsupported destination", 409);
    if (!Array.isArray(items) || !items.length || items.length > 20)
      throw new DomainError("Invalid regional cart");
    const currencies = new Set<string>(),
      seen = new Set<string>();
    for (const item of items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        seen.has(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10
      )
        throw new DomainError("Invalid regional cart");
      seen.add(item.productId);
      const p = this.store.db
        .prepare("SELECT currency FROM products WHERE id=? AND active=1")
        .get(item.productId);
      if (!p || !isCommerceCurrency(p.currency))
        throw new DomainError("Regional product unavailable", 409);
      currencies.add(p.currency);
    }
    if (currencies.size !== 1)
      throw new DomainError("Mixed currencies are not converted", 409);
    const policy = this.policy();
    if (
      (revision !== undefined || policy.revision > 0) &&
      revision !== policy.revision
    )
      throw new DomainError("Shipping changed; review checkout", 409);
    const region = policy.regions.find(
      (r) => r.country === country && r.enabled,
    );
    if (!region || !currencies.has(region.currency))
      throw new DomainError("Country or currency is not served", 409);
    if (method === "courier" && !region.courierEnabled)
      throw new DomainError("Delivery unavailable", 409);
    if (method === "pickup" && !region.pickupAddress)
      throw new DomainError("Pickup unavailable", 409);
    return {
      country: region.country,
      currency: region.currency,
      shippingRevision: policy.revision,
      feeMinor: method === "courier" ? region.courierFeeMinor : 0,
      pickupAddress: region.pickupAddress,
    };
  }
}
