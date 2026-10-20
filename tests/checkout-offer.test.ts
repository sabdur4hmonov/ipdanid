import { expect, it } from "vitest";
import { amountMinor, validOfferQuote } from "../src/checkout-offer";
import {
  checkoutSubmission,
  validCheckoutAttempt,
} from "../src/checkout-recovery";
import { offersText } from "../src/offers-i18n";
const id = "12345678-1234-1234-1234-123456789abc";
const quote = {
  id,
  expiresAt: 100000,
  subtotalMinor: 10000,
  feeMinor: 2000,
  discountMinor: 1000,
  totalMinor: 11000,
  currency: "UZS",
  settingsRevision: 3,
  offer: {
    version: "checkout-offer/1",
    quoteId: id,
    code: "TEST-2026",
    kind: "promo",
    ruleRevision: "1:1",
    subtotalMinor: 10000,
    discountMinor: 1000,
  },
};
it("quote review refuses mismatched identities, money, currency and unsupported offers", () => {
  expect(validOfferQuote(quote)).toBe(true);
  for (const bad of [
    null,
    {},
    { ...quote, id: "-".repeat(36) },
    { ...quote, currency: "USD" },
    { ...quote, discountMinor: 10000 },
    { ...quote, totalMinor: 10000 },
    { ...quote, totalMinor: 11000.1 },
    { ...quote, feeMinor: -1 },
    { ...quote, offer: { ...quote.offer, quoteId: "other" } },
    { ...quote, offer: { ...quote.offer, version: "future" } },
    { ...quote, offer: { ...quote.offer, discountMinor: 100 } },
    { ...quote, offer: { ...quote.offer, kind: "unknown" } },
    { ...quote, offer: { ...quote.offer, code: "bad<script>" } },
  ])
    expect(validOfferQuote(bad)).toBe(false);
});
it("UZS and percentage entries preserve exact hundredths without rounding or exponent coercion", () => {
  expect(amountMinor("12.34")).toBe(1234);
  expect(amountMinor("0,08")).toBe(8);
  expect(amountMinor(" 10 ")).toBe(1000);
  expect(amountMinor("0")).toBe(0);
  for (const bad of [
    "",
    " ",
    "1e3",
    "-1",
    "1.234",
    "NaN",
    "Infinity",
    "1 000",
    "100000000000000000",
    ".5",
  ])
    expect(() => amountMinor(bad)).toThrow();
});
it("accepted offer checkout retains the exact quote body/key across reload and refuses malformed references", () => {
  const body = {
    items: [{ productId: "original", quantity: 1 }],
    address: { name: "Maker", deliveryMethod: "pickup" },
    quote: { totalMinor: 9000, settingsRevision: 2, offerQuoteId: id },
  };
  const attempt = {
    key: "same-key",
    payload: JSON.stringify(body),
    display: {
      subtotal: 10000,
      feeMinor: 0,
      sellerName: "Original",
      sellerPhone: "",
      paymentDetails: "",
      pickupAddress: "Here",
      discountMinor: 1000,
      offerCode: "TEST-2026",
    },
  };
  expect(validCheckoutAttempt(attempt)).toBe(true);
  expect(checkoutSubmission(JSON.parse(JSON.stringify(attempt)))).toEqual({
    ...body,
    requestKey: "same-key",
  });
  for (const ref of ["", 42, [], "x".repeat(36)])
    expect(
      validCheckoutAttempt({
        ...attempt,
        payload: JSON.stringify({
          ...body,
          quote: { ...body.quote, offerQuoteId: ref },
        }),
      }),
    ).toBe(false);
  expect(
    validCheckoutAttempt({
      ...attempt,
      display: { ...attempt.display, discountMinor: -1 },
    }),
  ).toBe(false);
  expect(
    validCheckoutAttempt({
      ...attempt,
      display: { ...attempt.display, offerCode: "bad<" },
    }),
  ).toBe(false);
});
it("offer actions have all four plain-word locales", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    for (const key of [
      "admin",
      "code",
      "apply",
      "costs",
      "referralTerms",
      "costHelp",
      "stale",
      "unknown",
    ] as const)
      expect(offersText(locale, key).length).toBeGreaterThan(3);
  expect(offersText("uz-Cyrl", "admin")).toContain("харажат");
});
