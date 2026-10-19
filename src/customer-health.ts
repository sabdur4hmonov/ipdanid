// Local previews and the production API use the same account protocol.
// A production service is not rejected merely for truthfully reporting that
// it is no longer a sandbox. Unknown future protocols still fail explicitly.
export function customerHealthSandbox(value: unknown): boolean {
  const h = value as { sandbox?: unknown; apiVersion?: unknown };
  if (
    !h ||
    typeof h.sandbox !== "boolean" ||
    (h.apiVersion !== undefined &&
      !["business-sandbox/2", "product-api/3"].includes(
        String(h.apiVersion),
      )) ||
    (!h.sandbox && h.apiVersion !== "product-api/3")
  )
    throw Error("Unsupported account service");
  return h.sandbox;
}
