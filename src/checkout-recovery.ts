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
      Number.isSafeInteger(p.quote.settingsRevision),
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
