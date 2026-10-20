import { expect, it, vi } from "vitest";
import { validDigitalAttempt } from "../src/digital-attempt";
import {
  giftClaimLink,
  giftClaimCode,
  takeGiftClaim,
} from "../src/gift-claim-link";
import { kitClaimLink } from "../src/kit-claim-link";
import { journeyText } from "../src/journey-i18n";
const token = "12345678-1234-1234-1234-123456789abc." + "a".repeat(64);
it("gift links keep credentials in fragments and preserve the existing kit link contract", () => {
  const link = giftClaimLink("https://craft.example", token),
    u = new URL(link);
  expect(u.search).toBe("");
  expect(giftClaimCode(u.hash) === token).toBe(true);
  expect(kitClaimLink("https://craft.example", "A".repeat(32))).toBe(
    "https://craft.example/#kit=" + "A".repeat(32),
  );
  for (const origin of [
    "http://external.example",
    "https://user:password@craft.example",
    "https://craft.example/path",
    "https://craft.example/?x=1",
    "https://craft.example/#x",
  ])
    expect(() => giftClaimLink(origin, token)).toThrow(/origin/);
  expect(() => giftClaimLink("https://craft.example", "bad")).toThrow();
  expect(giftClaimCode("#gift=bad")).toBeNull();
  expect(giftClaimCode("#gift=" + token + "&extra=true")).toBeNull();
});
it("both valid and malformed gift fragments are scrubbed without persisting the code", () => {
  const replaceState = vi.fn();
  vi.stubGlobal("window", {
    location: { hash: "#gift=" + token, pathname: "/", search: "" },
    history: { replaceState },
  });
  expect(takeGiftClaim() === token).toBe(true);
  expect(replaceState).toHaveBeenCalledWith(null, "", "/");
  (window.location as any).hash = "#gift=bad";
  expect(takeGiftClaim()).toBeNull();
  expect(replaceState).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});
it("digital pending recovery retains original body/key and discards malformed or expired drafts", () => {
  const now = 1780000000000,
    value = {
      version: "digital-attempt/1",
      createdAt: now,
      display: { name: "Original gift", credits: 3 },
      body: {
        productId: "gift-kit",
        kind: "gift",
        name: "Synthetic buyer",
        locale: "en",
        requestKey: "12345678-1234-1234-1234-123456789abc",
        quote: {
          productRevision: 3,
          settingsRevision: 2,
          catalogRevision: 4,
          currency: "USD",
          totalMinor: 12000,
        },
      },
    };
  expect(validDigitalAttempt(JSON.parse(JSON.stringify(value)), now)).toBe(
    true,
  );
  for (const bad of [
    { ...value, createdAt: now - 8 * 86400000 },
    { ...value, createdAt: now + 400000 },
    { ...value, body: { ...value.body, kind: ["gift"] } },
    { ...value, body: { ...value.body, claimToken: "not-allowed" } },
    {
      ...value,
      body: {
        ...value.body,
        quote: { ...value.body.quote, currency: ["USD"] },
      },
    },
    { ...value, display: { name: "Changed", credits: -1 } },
    { ...value, claimToken: "not-allowed" },
  ])
    expect(validDigitalAttempt(bad, now)).toBe(false);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    expect(journeyText(locale, "giftTerms").includes("30")).toBe(true);
    expect(journeyText(locale, "noShipping").length).toBeGreaterThan(10);
  }
  expect(journeyText("uz-Cyrl", "gift")).toMatch(/[А-Яа-я]/);
});
