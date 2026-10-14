import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import {
  LETTERING_FONTS,
  shapeLettering,
  rasterLettering,
  letteringPins,
  letteringInput,
} from "../src/core/lettering";
const bytes = (key: keyof typeof LETTERING_FONTS) =>
  new Uint8Array(readFileSync("public" + LETTERING_FONTS[key].path));
for (const [text, font] of [
  ["SALOM", "sans"],
  ["МИР", "sans"],
  ["سلام", "arabic"],
] as const)
  it(`${text}: pinned offline font, shaped geometry, deterministic target and physically spaced pins`, async () => {
    const g = await shapeLettering(text, bytes(font), {
        widthMm: 600,
        heightMm: 300,
        shape: "rectangle",
      }),
      again = await shapeLettering(text, bytes(font), {
        widthMm: 600,
        heightMm: 300,
        shape: "rectangle",
      });
    expect(g).toEqual(again);
    expect(g.font).toBe(font);
    expect(g.direction).toBe(font === "arabic" ? "rtl" : "ltr");
    expect(g.contours.length).toBeGreaterThan(0);
    expect(
      g.contours.every((p) => p[0].x === p.at(-1)!.x && p[0].y === p.at(-1)!.y),
    ).toBe(true);
    const target = rasterLettering(g, 160);
    expect(target).toEqual(rasterLettering(again, 160));
    expect(target.some((v) => v === 0)).toBe(true);
    expect(target.some((v) => v > 0 && v < 255)).toBe(true);
    const layout = letteringPins(g, 120, 1.8);
    expect(layout.pins).toHaveLength(120);
    expect(layout.contours.reduce((n, c) => n + c.count, 0)).toBe(120);
    for (let a = 0; a < 120; a++)
      for (let b = a + 1; b < 120; b++)
        expect(
          Math.hypot(
            (layout.pins[a].x - layout.pins[b].x) * 600,
            (layout.pins[a].y - layout.pins[b].y) * 300,
          ),
        ).toBeGreaterThanOrEqual(1.8);
  });
it("Arabic contextual joining uses OpenType glyph forms and visual order, never reversed logical text", async () => {
  const data = bytes("arabic"),
    font = fontkit.create(data),
    g = await shapeLettering("سلام", data, {
      widthMm: 400,
      heightMm: 400,
      shape: "circle",
    });
  expect(g.text).toBe("سلام");
  expect(g.glyphs).not.toEqual(font.glyphsForString(g.text).map((v) => v.id));
  expect(g.glyphs).toEqual(font.layout(g.text).glyphs.map((v) => v.id));
  const components = (p: Uint8Array, n: number) => {
    const seen = new Uint8Array(n * n);
    let count = 0;
    for (let k = 0; k < n * n; k++) {
      if (seen[k] || p[k * 3] >= 128) continue;
      const queue = [k];
      seen[k] = 1;
      let size = 0;
      for (let j = 0; j < queue.length; j++) {
        size++;
        const at = queue[j],
          x = at % n,
          y = Math.floor(at / n);
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const xx = x + dx,
            yy = y + dy,
            v = yy * n + xx;
          if (
            xx >= 0 &&
            xx < n &&
            yy >= 0 &&
            yy < n &&
            !seen[v] &&
            p[v * 3] < 128
          ) {
            seen[v] = 1;
            queue.push(v);
          }
        }
      }
      if (size >= 3) count++;
    }
    return count;
  };
  const joined = await shapeLettering("بب", data, {
      widthMm: 400,
      heightMm: 200,
      shape: "rectangle",
    }),
    separate = await shapeLettering("ب ب", data, {
      widthMm: 400,
      heightMm: 200,
      shape: "rectangle",
    });
  expect(components(rasterLettering(joined, 320), 320)).toBeLessThan(
    components(rasterLettering(separate, 320), 320),
  );
});
it("nonzero winding preserves counters; shape placement stays within circle/heart", async () => {
  const o = await shapeLettering("O", bytes("sans"), {
      widthMm: 400,
      heightMm: 400,
      shape: "rectangle",
    }),
    target = rasterLettering(o, 160);
  expect(target[(80 * 160 + 80) * 3]).toBe(255);
  for (const shape of ["circle", "heart"] as const) {
    const g = await shapeLettering("МИР", bytes("sans"), {
      widthMm: 400,
      heightMm: 400,
      shape,
    });
    expect(rasterLettering(g, 64).some((v) => v === 0)).toBe(true);
  }
});
it("rejects missing glyphs, wrong font, mixed bidi and unsafe physical spacing explicitly", async () => {
  expect(() => letteringInput(" ")).toThrow("text");
  expect(() => letteringInput("x\ny")).toThrow("text");
  expect(() => letteringInput("سلام Salom")).toThrow("mixed-script");
  await expect(
    shapeLettering("سلام", bytes("sans"), {
      widthMm: 400,
      heightMm: 400,
      shape: "circle",
    }),
  ).rejects.toThrow("font");
  await expect(
    shapeLettering("😀", bytes("sans"), {
      widthMm: 400,
      heightMm: 400,
      shape: "circle",
    }),
  ).rejects.toThrow("glyph");
  const g = await shapeLettering("O", bytes("sans"), {
    widthMm: 50,
    heightMm: 50,
    shape: "rectangle",
  });
  expect(() => letteringPins(g, 240, 3)).toThrow("spacing");
});
