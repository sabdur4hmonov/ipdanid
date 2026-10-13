import { it, expect } from "vitest";
import {
  checkoutSubmission,
  validCheckoutAttempt,
} from "../src/checkout-recovery";
import { validBusinessSnapshot } from "../src/business-snapshot";
import { DEFAULT_STOREFRONT } from "../src/business-types";
it("a persisted pending order retries its original body/key, independent of newer catalogue/configuration", () => {
  const body = {
    items: [{ productId: "original", quantity: 2 }],
    address: {
      name: "Person",
      deliveryMethod: "pickup",
      phone: "901234567",
      city: "",
      street: "",
    },
    quote: { totalMinor: 12300, settingsRevision: 2 },
  };
  const saved = JSON.parse(
    JSON.stringify({
      key: "one-idempotency-key",
      payload: JSON.stringify(body),
      display: {
        subtotal: 12300,
        feeMinor: 0,
        sellerName: "Original seller",
        paymentDetails: "Original payment",
        pickupAddress: "Original pickup",
        sellerPhone: "",
      },
    }),
  );
  expect(validCheckoutAttempt(saved)).toBe(true);
  expect(checkoutSubmission(saved)).toEqual({
    ...body,
    requestKey: "one-idempotency-key",
  });
  expect(checkoutSubmission(saved).quote.settingsRevision).toBe(2);
  expect(validCheckoutAttempt({ ...saved, payload: "{}" })).toBe(false);
  expect(() => checkoutSubmission({ ...saved, payload: "broken" })).toThrow();
});
it("cached commerce is optional but malformed state never becomes trusted prices or messages", () => {
  const valid = { settings: DEFAULT_STOREFRONT, announcements: [] };
  expect(validBusinessSnapshot(valid)).toBe(true);
  expect(
    validBusinessSnapshot({
      ...valid,
      settings: { ...DEFAULT_STOREFRONT, deliveryFeeMinor: -1 },
    }),
  ).toBe(false);
  expect(
    validBusinessSnapshot({
      ...valid,
      settings: { ...DEFAULT_STOREFRONT, sellerName: null },
    }),
  ).toBe(false);
  expect(
    validBusinessSnapshot({
      ...valid,
      announcements: [
        {
          id: "x",
          title: "x",
          body: "x",
          kind: "news",
          startsAt: 0,
          endsAt: 2,
          revision: 1,
          active: "yes",
        },
      ],
    }),
  ).toBe(false);
});
