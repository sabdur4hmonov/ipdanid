import { expect, it } from "vitest";
import { customerHealthSandbox } from "../src/customer-health";
it("permits the production account protocol and preserves compatible local services", () => {
  expect(
    customerHealthSandbox({ sandbox: false, apiVersion: "product-api/3" }),
  ).toBe(false);
  expect(
    customerHealthSandbox({ sandbox: true, apiVersion: "business-sandbox/2" }),
  ).toBe(true);
  expect(customerHealthSandbox({ sandbox: true })).toBe(true);
  for (const bad of [
    null,
    {},
    false,
    { sandbox: "false", apiVersion: "product-api/3" },
    { sandbox: false },
    { sandbox: false, apiVersion: "business-sandbox/2" },
    { sandbox: true, apiVersion: "future/99" },
  ])
    expect(() => customerHealthSandbox(bad)).toThrow("Unsupported");
});
