import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  approvedMarketingAsset,
  marketingAssets,
} from "../scripts/marketing-assets.mjs";

describe("reviewed generated marketing media export boundary", () => {
  it("permits only the exact reviewed generated concept bytes at their approved paths", () => {
    for (const path of Object.keys(marketingAssets)) {
      const bytes = readFileSync(path);
      expect(approvedMarketingAsset(path, bytes)).toBe(true);
      const altered = Buffer.from(bytes);
      altered[altered.length - 1] ^= 1;
      expect(approvedMarketingAsset(path, altered)).toBe(false);
      expect(approvedMarketingAsset("public/owner-portrait.webp", bytes)).toBe(
        false,
      );
      expect(approvedMarketingAsset("output/" + path, bytes)).toBe(false);
    }
  });
  it("does not permit an arbitrary photograph or inherited object key", () => {
    expect(
      approvedMarketingAsset(
        "src/assets/photo.jpg",
        Buffer.from("personal photo"),
      ),
    ).toBe(false);
    expect(approvedMarketingAsset("__proto__", Buffer.from("anything"))).toBe(
      false,
    );
  });
});
