import { afterEach, expect, it, vi } from "vitest";
import {
  kitClaimLink,
  kitClaimCode,
  takeKitClaim,
} from "../src/kit-claim-link";
import { partnerText } from "../src/partner-i18n";
afterEach(() => vi.unstubAllGlobals());
const code = "Original_SYNTHETIC_KIT_01".padEnd(32, "X");
it("recipient URLs put the exact code only in a fragment on a clean HTTPS origin or local test loopback", () => {
  for (const origin of [
    "https://craft.example",
    "http://127.0.0.1:4410",
    "https://craft.example/",
  ]) {
    const link = kitClaimLink(origin, code),
      url = new URL(link);
    expect(url.search).toBe("");
    expect(url.pathname).toBe("/");
    expect(kitClaimCode(url.hash)).toBe(code);
    expect(url.origin.includes(code)).toBe(false);
  }
  for (const origin of [
    "javascript:alert(1)",
    "file:///tmp/",
    "http://craft.example",
    "https://user:pass@craft.example",
    "https://craft.example/?code=x",
    "https://craft.example/#x",
    "https://craft.example/path",
    "https://craft.example//evil.example",
  ])
    expect(() => kitClaimLink(origin, code)).toThrow();
  for (const invalid of [
    "bad",
    "x".repeat(33),
    "x".repeat(31),
    "https://craft.example/",
  ])
    expect(() => kitClaimLink("https://craft.example", invalid)).toThrow();
});
it("claim parsing refuses extra fields and history is scrubbed even for malformed fragments before redemption", () => {
  for (const hash of [
    "#kit=bad",
    "#kit=" + code + "&account=other",
    "#kit=" + encodeURIComponent(code) + "x",
    "#other=" + code,
  ])
    expect(kitClaimCode(hash)).toBeNull();
  const replaceState = vi.fn();
  vi.stubGlobal("window", {
    location: { hash: "#kit=" + code, pathname: "/", search: "?lang=en" },
    history: { replaceState },
  });
  expect(takeKitClaim()).toBe(code);
  expect(replaceState).toHaveBeenCalledWith(null, "", "/?lang=en");
  (window.location as any).hash = "#kit=bad";
  expect(takeKitClaim()).toBeNull();
  expect(replaceState).toHaveBeenCalledTimes(2);
});
it("partner and recipient actions have four locales", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    for (const word of [
      "portal",
      "admin",
      "approveConsent",
      "claimHelp",
      "private",
      "once",
      "tierPrice",
    ] as const)
      expect(partnerText(locale, word).length).toBeGreaterThan(3);
  expect(partnerText("uz-Cyrl", "portal")).toContain("Ҳамкор");
});
