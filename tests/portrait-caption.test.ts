import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  withPortraitCaption,
  captionGeometry,
} from "../src/core/portrait-caption";
import { frameProduct } from "../src/core/product-framing";
import {
  LETTERING_FONTS,
  shapeLettering,
  rasterLettering,
} from "../src/core/lettering";
import { inside } from "../src/core/geometry";
const face = { left: 0.3, top: 0.25, width: 0.4, height: 0.5 };
for (const shape of ["circle", "rectangle", "heart"] as const)
  it(`${shape}: caption is real shaped target ink below the portrait and blank preserves old framing`, async () => {
    const base = frameProduct("people", [face], shape, 1);
    expect(withPortraitCaption(base, shape, "  ")).toBe(base);
    for (const text of ["Ali 2026", "Али 2026", "علي ٢٠٢٦"]) {
      const f = withPortraitCaption(base, shape, text),
        proof = f.caption!;
      expect(f.version).toBe("reviewed-caption-framing/6");
      expect(base.version).toBe("reviewed-product-framing/5");
      expect(f.targetFaces![0].height).toBeLessThan(
        base.targetFaces![0].height,
      );
      const bytes = new Uint8Array(
          readFileSync("public" + LETTERING_FONTS[proof.font].path),
        ),
        g = captionGeometry(
          await shapeLettering(text, bytes, {
            widthMm: 500,
            heightMm: 500,
            shape: "rectangle",
          }),
          proof.bounds,
        ),
        pixels = rasterLettering(g, 160);
      expect(g.contours.flat().every((p) => inside(shape, p.x, p.y))).toBe(
        true,
      );
      expect(pixels.some((v) => v < 80)).toBe(true);
      const rows = Array.from({ length: 160 }, (_, y) =>
        pixels.slice(y * 480, (y + 1) * 480).some((v) => v < 250) ? y : -1,
      ).filter((y) => y >= 0);
      expect(Math.min(...rows)).toBeGreaterThanOrEqual(
        Math.floor(proof.bounds.top * 159) - 1,
      );
    }
  });
it("caption refuses control/oversize text and non-portrait recipes", () => {
  const base = frameProduct("people", [face], "circle", 1);
  for (const text of ["x".repeat(65), "a\nname", "\u202eAli"])
    expect(() => withPortraitCaption(base, "circle", text)).toThrow();
  expect(() =>
    withPortraitCaption(
      { ...base, product: { kind: "animal" } },
      "circle",
      "Ali",
    ),
  ).toThrow();
});
