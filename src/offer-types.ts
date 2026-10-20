export type OrderQuote = {
  currency?: import("./commerce-regions").CommerceCurrency;
  shippingRevision?: number;
  totalMinor: number;
  settingsRevision: number;
  offerQuoteId?: string;
  catalogRevision?: number;
};
export type OrderOffer = {
  version: "checkout-offer/1";
  quoteId: string;
  code: string;
  kind: "promo" | "referral";
  ruleRevision: string;
  subtotalMinor: number;
  discountMinor: number;
};
export type OfferRule = {
  discountType: "percent" | "fixed";
  value: number;
  maxDiscountMinor: number;
  minSubtotalMinor: number;
  startsAt: number;
  expiresAt: number;
  maxUses: number;
  perAccountLimit: number;
  enabled: boolean;
  revision: number;
};
export type OfferQuote = {
  id: string;
  expiresAt: number;
  subtotalMinor: number;
  feeMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: "UZS";
  settingsRevision: number;
  offer: OrderOffer;
};
export type OrderActualCosts = {
  materialsMinor: number;
  packingMinor: number;
  fulfillmentMinor: number;
  providerFeeMinor: number;
  marketingMinor: number;
  referralRewardMinor: number;
};
