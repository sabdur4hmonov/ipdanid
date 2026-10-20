import { isCommerceCurrency, isCommerceCountry } from "./commerce-regions";
import type { CatalogItemSnapshot } from "./catalog-types";
export type CheckoutAttempt = {
  key: string;
  payload: string;
  display?: {
    subtotal: number;
    feeMinor: number;
    sellerName: string;
    paymentDetails: string;
    pickupAddress: string;
    sellerPhone: string;
    discountMinor?: number;
    offerCode?: string;
    currency?: string;
    items?: CatalogItemSnapshot[];
  };
};
export function validCheckoutAttempt(value: unknown): value is CheckoutAttempt {
  const v = value as CheckoutAttempt;
  if (
    !v ||
    typeof v.key !== "string" ||
    !v.key ||
    v.key.length > 100 ||
    typeof v.payload !== "string" ||
    v.payload.length > 20000
  )
    return false;
  try {
    const p = JSON.parse(v.payload);
    return Boolean(
      p &&
      Array.isArray(p.items) &&
      p.items.length > 0 &&
      p.items.length <= 100 &&
      p.items.every(
        (i: { productId: string; quantity: number }) =>
          typeof i.productId === "string" &&
          Number.isSafeInteger(i.quantity) &&
          i.quantity > 0,
      ) &&
      p.address &&
      typeof p.address.name === "string" &&
      ["pickup", "courier"].includes(p.address.deliveryMethod) &&
      Number.isSafeInteger(p.quote?.totalMinor) &&
      p.quote.totalMinor >= 0 &&
      Number.isSafeInteger(p.quote.settingsRevision) &&
      (p.address.country === undefined ||
        isCommerceCountry(p.address.country)) &&
      (p.quote.currency === undefined ||
        isCommerceCurrency(p.quote.currency)) &&
      (p.quote.shippingRevision === undefined ||
        (Number.isSafeInteger(p.quote.shippingRevision) &&
          p.quote.shippingRevision >= 0)) &&
      (v.display?.currency === undefined ||
        isCommerceCurrency(v.display.currency)) &&
      (v.display?.items === undefined ||
        (Array.isArray(v.display.items) &&
          v.display.items.length <= 20 &&
          v.display.items.every(
            (i) =>
              i &&
              typeof i.productId === "string" &&
              typeof i.name === "string" &&
              typeof i.profileId === "string" &&
              isCommerceCurrency(i.currency) &&
              Number.isSafeInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 10 &&
              Number.isSafeInteger(i.priceMinor) &&
              i.priceMinor >= 0 &&
              Number.isSafeInteger(i.credits) &&
              i.credits >= 0 &&
              (i.sku === null ||
                (i.sku &&
                  typeof i.sku === "object" &&
                  i.sku.version === "catalog-sku/1" &&
                  typeof i.sku.material === "string")),
          ))) &&
      (p.quote.catalogRevision === undefined ||
        (Number.isSafeInteger(p.quote.catalogRevision) &&
          p.quote.catalogRevision >= 0)) &&
      (p.quote.offerQuoteId === undefined ||
        (typeof p.quote.offerQuoteId === "string" &&
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
            p.quote.offerQuoteId,
          ))) &&
      (v.display?.discountMinor === undefined ||
        (Number.isSafeInteger(v.display.discountMinor) &&
          v.display.discountMinor >= 0)) &&
      (v.display?.offerCode === undefined ||
        (typeof v.display.offerCode === "string" &&
          /^[A-Z0-9][A-Z0-9-]{3,23}$/.test(v.display.offerCode))),
    );
  } catch {
    return false;
  }
}
// Once sent, always retry this exact body/key. A config refresh must not create a second order.
export function checkoutSubmission(attempt: CheckoutAttempt) {
  if (!validCheckoutAttempt(attempt))
    throw Error("Invalid saved checkout attempt");
  return { ...JSON.parse(attempt.payload), requestKey: attempt.key };
}
