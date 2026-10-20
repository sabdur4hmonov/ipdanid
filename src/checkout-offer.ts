import type { OfferQuote } from "./offer-types";
// Client validation is for review/recovery only. Server always reprices inside checkout.
export function validOfferQuote(value: unknown): value is OfferQuote {
  const q = value as OfferQuote;
  return Boolean(
    q &&
    typeof q.id === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
      q.id,
    ) &&
    q.currency === "UZS" &&
    [
      q.expiresAt,
      q.subtotalMinor,
      q.feeMinor,
      q.discountMinor,
      q.totalMinor,
      q.settingsRevision,
    ].every((n) => Number.isSafeInteger(n) && n >= 0) &&
    q.discountMinor < q.subtotalMinor &&
    q.totalMinor === q.subtotalMinor + q.feeMinor - q.discountMinor &&
    q.offer?.version === "checkout-offer/1" &&
    q.offer.quoteId === q.id &&
    q.offer.subtotalMinor === q.subtotalMinor &&
    q.offer.discountMinor === q.discountMinor &&
    typeof q.offer.code === "string" &&
    /^[A-Z0-9][A-Z0-9-]{3,23}$/.test(q.offer.code) &&
    ["promo", "referral"].includes(q.offer.kind),
  );
}
export function amountMinor(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw Error("Invalid amount");
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000_000)
    throw Error("Invalid amount");
  return n;
}
