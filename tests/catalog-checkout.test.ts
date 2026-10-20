import { expect, it } from "vitest";
import {
  checkoutRegion,
  cartMatchesCurrency,
  type CommerceProduct,
} from "../src/catalog-checkout";
import {
  validCheckoutAttempt,
  checkoutSubmission,
} from "../src/checkout-recovery";
import { catalogText, countryName } from "../src/catalog-i18n";
it("legacy settings stay dynamic; configured countries never fall back to a different shipping currency", () => {
  const legacy = {
    pickupAddress: "Original pickup",
    deliveryEnabled: true,
    deliveryFeeMinor: 500,
  };
  expect(checkoutRegion(undefined, "UZ", legacy)).toMatchObject({
    currency: "UZS",
    courierFeeMinor: 500,
  });
  expect(checkoutRegion(undefined, "US", legacy)?.enabled).toBe(false);
  const policy = {
    version: "commerce-regions/1" as const,
    revision: 3,
    usesLegacy: false,
    regions: [
      {
        country: "US" as const,
        currency: "USD" as const,
        enabled: true,
        pickupAddress: "US pickup",
        courierEnabled: true,
        courierFeeMinor: 700,
      },
    ],
  };
  expect(checkoutRegion(policy, "UZ", legacy)).toBeUndefined();
  expect(checkoutRegion(policy, "US", legacy)?.courierFeeMinor).toBe(700);
  const products = [
    { id: "usd", currency: "USD" },
    { id: "uzs", currency: "UZS" },
  ] as CommerceProduct[];
  expect(cartMatchesCurrency(products, { usd: 1 }, "USD")).toBe(true);
  expect(cartMatchesCurrency(products, { usd: 1, uzs: 1 }, "USD")).toBe(false);
  expect(cartMatchesCurrency(products, { missing: 1 }, "USD")).toBe(false);
});
it("regional recovery retains the original currency, material, country, shipping revision and total", () => {
  const body = {
      items: [{ productId: "original", quantity: 1 }],
      address: { name: "Maker", deliveryMethod: "pickup", country: "US" },
      quote: {
        totalMinor: 12000,
        settingsRevision: 2,
        catalogRevision: 4,
        currency: "USD",
        shippingRevision: 3,
      },
    },
    attempt = {
      key: "same-original-key",
      payload: JSON.stringify(body),
      display: {
        subtotal: 12000,
        feeMinor: 0,
        sellerName: "Seller",
        paymentDetails: "",
        pickupAddress: "Original pickup",
        sellerPhone: "",
        currency: "USD",
        items: [
          {
            productId: "original",
            quantity: 1,
            name: "Original kit",
            priceMinor: 12000,
            currency: "USD",
            profileId: "standard-base-r1",
            credits: 3,
            sku: null,
          },
        ],
      },
    };
  expect(validCheckoutAttempt(attempt)).toBe(true);
  expect(checkoutSubmission(JSON.parse(JSON.stringify(attempt)))).toEqual({
    ...body,
    requestKey: attempt.key,
  });
  for (const q of [
    { currency: ["USD"] },
    { currency: "EUR" },
    { shippingRevision: -1 },
    { shippingRevision: 1.2 },
  ])
    expect(
      validCheckoutAttempt({
        ...attempt,
        payload: JSON.stringify({ ...body, quote: { ...body.quote, ...q } }),
      }),
    ).toBe(false);
  expect(
    validCheckoutAttempt({
      ...attempt,
      display: { ...attempt.display, currency: "EUR" },
    }),
  ).toBe(false);
});
it("catalog customer terms exist in all four locales with country names", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    expect(catalogText(locale, "creditUnlimited").length).toBeGreaterThan(5);
    expect(catalogText(locale, "afterActivation").length).toBeGreaterThan(5);
    expect(countryName(locale, "US").length).toBeGreaterThan(2);
  }
  expect(catalogText("uz-Cyrl", "material")).toMatch(/[А-Яа-я]/);
});
