import type { CatalogSku } from "./catalog-types";
import type { CommerceRegions, CommerceCountry } from "./commerce-regions";
export type CommerceProduct = {
  id: string;
  name: string;
  family: string;
  price_minor: number;
  currency: string;
  stock: number;
  credits: number;
  revision: number;
  description: string;
  profile_id: string;
  active: number;
};
export type ShopCatalog = {
  contents?: Record<string, { name: string; quantity: number }[]>;
  products: CommerceProduct[];
  skus?: Record<string, CatalogSku>;
  catalogRevision?: number;
  regions?: CommerceRegions;
};
export function checkoutRegion(
  policy: CommerceRegions | undefined,
  country: string,
  legacy: {
    pickupAddress: string;
    deliveryEnabled: boolean;
    deliveryFeeMinor: number;
  },
) {
  return policy?.usesLegacy === false
    ? policy.regions.find((r) => r.country === country && r.enabled)
    : {
        country: "UZ" as CommerceCountry,
        currency: "UZS" as const,
        enabled: country === "UZ",
        pickupAddress: legacy.pickupAddress,
        courierEnabled: legacy.deliveryEnabled,
        courierFeeMinor: legacy.deliveryFeeMinor,
      };
}
export function cartMatchesCurrency(
  products: CommerceProduct[],
  cart: Record<string, number>,
  currency: string,
) {
  return Object.keys(cart).every(
    (id) => products.find((p) => p.id === id)?.currency === currency,
  );
}
