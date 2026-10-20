// Selected ISO4217 currencies use two minor-unit digits. Prices are explicit;
// this module never converts between currencies or invents exchange rates.
export const COMMERCE_CURRENCIES = ["UZS", "USD", "RUB"] as const;
export type CommerceCurrency = (typeof COMMERCE_CURRENCIES)[number];
export const COMMERCE_COUNTRIES = [
  "UZ",
  "US",
  "RU",
  "KZ",
  "KG",
  "TJ",
  "TR",
  "AE",
] as const;
export type CommerceCountry = (typeof COMMERCE_COUNTRIES)[number];
export const isCommerceCurrency = (value: unknown): value is CommerceCurrency =>
  typeof value === "string" &&
  COMMERCE_CURRENCIES.includes(value as CommerceCurrency);
export const isCommerceCountry = (value: unknown): value is CommerceCountry =>
  typeof value === "string" &&
  COMMERCE_COUNTRIES.includes(value as CommerceCountry);
export type CommerceRegion = {
  country: CommerceCountry;
  currency: CommerceCurrency;
  enabled: boolean;
  pickupAddress: string;
  courierEnabled: boolean;
  courierFeeMinor: number;
};
export type CommerceRegions = {
  version: "commerce-regions/1";
  revision: number;
  usesLegacy: boolean;
  regions: CommerceRegion[];
};
export type ShippingSnapshot = {
  country: CommerceCountry;
  currency: CommerceCurrency;
  shippingRevision: number;
  feeMinor: number;
  pickupAddress: string;
};
export interface RegionalCommerce {
  quote(
    items: { productId: string; quantity: number }[],
    country: unknown,
    method: unknown,
    revision?: number,
  ): ShippingSnapshot;
}
