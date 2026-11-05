import { afterEach, describe, expect, it } from "vitest";
import {
  websiteFaceQuality,
  websitePortraitPlacement,
  fadeWebsitePixels,
} from "../src/core/website-framing";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { websiteText } from "../src/website-i18n";
import { phoneContact, telegramContact } from "../src/owner-contact";
import { KitStore } from "../server/kit-store";
const face = { left: 0.38, top: 0.3, width: 0.22, height: 0.3 };
describe("W1 photograph guard and reversible defaults", () => {
  it("checks relative height OR original pixel resolution, including exact thresholds", () => {
    expect(websiteFaceQuality([face], 1000)).toEqual({
      far: false,
      lowResolution: false,
    });
    expect(websiteFaceQuality([{ ...face, height: 0.249 }], 2000)).toEqual({
      far: true,
      lowResolution: false,
    });
    expect(websiteFaceQuality([face], 800)).toEqual({
      far: true,
      lowResolution: true,
    });
    expect(websiteFaceQuality([{ ...face, height: 0.25 }], 1000)).toEqual({
      far: false,
      lowResolution: false,
    });
    expect(websiteFaceQuality([], 100)).toEqual({
      far: false,
      lowResolution: false,
    });
    // Original2500px, working1536px: do not falsely flag a290px source face as low-res.
    expect(
      websiteFaceQuality([{ ...face, height: 0.116 }], 2500).lowResolution,
    ).toBe(false);
  });
  for (const shape of ["circle", "rectangle", "heart"] as const)
    it(`uses only legal pan/zoom with a larger face in ${shape}`, () => {
      const old = frameFreePhoto("people", [face], shape, 0.75);
      const a = websitePortraitPlacement([face], shape, 0.75);
      const next = frameFreePhoto("people", [face], shape, 0.75, a);
      expect(next.targetFaces![0].height).toBeGreaterThan(
        old.targetFaces![0].height,
      );
      expect(websitePortraitPlacement([face], shape, 0.75)).toEqual(a);
      expect(a.zoom).toBeLessThanOrEqual(4);
      expect(next.version).toBe(old.version);
    });
  it("whitens actual shirt pixels with a smooth fade and preserves pixels above the chin", () => {
    const p = new Uint8ClampedArray(500 * 500 * 4).fill(80);
    for (let k = 3; k < p.length; k += 4) p[k] = 255;
    fadeWebsitePixels(p, 500, 500, [face], 1);
    const at = (y: number) => p[(y * 500 + 250) * 4];
    expect(at(250)).toBe(80);
    expect(at(299)).toBeGreaterThan(80);
    expect(at(320)).toBe(255);
  });
  it("has complete plain text in four locales and contact URLs contain only the work ID", () => {
    for (const l of ["uz", "uz-Cyrl", "ru", "en"] as const)
      for (const k of [
        "far",
        "low",
        "buy",
        "terms",
        "login",
        "telegram",
      ] as const)
        expect(websiteText(l, k).length).toBeGreaterThan(8);
    const u = new URL(telegramContact("a".repeat(64)));
    expect(u.hostname).toBe("t.me");
    expect(u.searchParams.get("text")).toContain("a".repeat(64));
    expect(phoneContact()).toMatch(/^tel:/);
  });
});
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
for (const identity of ["Maker_One", "+998901234567", "legacy@example.com"])
  it(`account ${identity.includes("@") ? "email" : identity.startsWith("+") ? "phone" : "username"} retains three kit builds and free cross-device reopening`, () => {
    const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
    stores.push(s);
    const a = s.register(s.createGuest().id, identity, "w1 test long password");
    const code = s.issueKitBatch("admin", "standard-base-r1", 1, "w1-attach")
      .codes[0].code;
    expect(s.loginKit(code, a.id).id).toBe(a.id);
    const second = s.login(identity.toLowerCase(), "w1 test long password");
    expect(second.id).toBe(a.id);
    expect(s.kitBalance(second.id)).toBe(3);
    for (const ch of ["a", "b", "c"]) {
      s.unlockBuild(
        a.id,
        ch.repeat(64),
        "first-device-123456",
        `first-${ch}-key`,
      );
    }
    expect(s.kitBalance(a.id)).toBe(0);
    expect(
      s.unlockBuild(a.id, "a".repeat(64), "second-device-123456", "reopen-free")
        .credits,
    ).toBe(0);
    expect(() =>
      s.unlockBuild(a.id, "d".repeat(64), "second-device-123456", "fourth"),
    ).toThrow();
    const recovered = s.recover(
      identity,
      a.recoveryKey,
      "w1 replacement password",
    );
    expect(recovered.id).toBe(a.id);
    expect(s.kitAccount(a.id).unlocks.length).toBe(3);
  });
