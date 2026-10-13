import { it, expect } from "vitest";
import { resolveBackendUrl } from "../src/backend-url";
it("native releases have no assumed localhost backend and malformed settings leave local art usable", () => {
  expect(resolveBackendUrl(true)).toBeUndefined();
  for (const url of ["invalid", "javascript:alert(1)", "http://merchant.example/api", "https://user:pass@example.test/api", "https://example.test/api?token=secret"])
    expect(resolveBackendUrl(true, url)).toBeUndefined();
  expect(resolveBackendUrl(false)).toBe("/api");
  expect(resolveBackendUrl(true, "https://example.test/api/")).toBe("https://example.test/api");
  expect(resolveBackendUrl(true, "http://127.0.0.1:4331/api")).toBe("http://127.0.0.1:4331/api");
});
