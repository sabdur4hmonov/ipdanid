import { expect, it } from "vitest";
import { decode, toRGBA8 } from "@pdf-lib/upng";
import { generate } from "../src/core/engine";
import { createProfile, inside } from "../src/core/geometry";
import { strandFootprint, rasterSequence } from "../src/core/optical";
import { previewPng } from "../src/core/preview-png";

it("conserves physical thread coverage for horizontal and diagonal strands on a rectangular board", () => {
  const p = createProfile("rectangle", 60, "dark", { widthMm: 400, heightMm: 300 });
  p.pins = [{ id: 0, x: .2, y: .2 }, { id: 1, x: .8, y: .2 }, { id: 2, x: .8, y: .8 }];
  for (const to of [1, 2]) {
    const f = strandFootprint(p, 0, to, 160);
    const length = Math.hypot((p.pins[to].x - .2) * 400, (p.pins[to].y - .2) * 300);
    const expected = p.opacity * p.threadMm * length * 159 ** 2 / (400 * 300);
    expect(Array.from(f.alpha).reduce((a, b) => a + b, 0)).toBeCloseTo(expected, 4);
  }
});

it("preserves eyes and mouth in an original portrait fixture, with honest preview/PDF error", async () => {
  const n = 96;
  const feature = (x: number, y: number) =>
    (Math.abs(x - .38) < .05 || Math.abs(x - .62) < .05) && Math.abs(y - .43) < .025 ||
    Math.abs(x - .5) < .11 && Math.abs(y - .65) < .02;
  const pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
    const x = (Math.floor(k / 3) % n) / (n - 1), y = Math.floor(k / 3 / n) / (n - 1);
    const face = ((x - .5) / .23) ** 2 + ((y - .5) / .31) ** 2 < 1;
    return feature(x, y) ? 35 : face ? 220 : y < .3 || y > .8 ? 60 : 248;
  });
  const i = await generate({ pixels, resolution: n, profile: createProfile("circle", 120), lines: 1800, mode: "dark" });
  const raster = rasterSequence(i);
  let sum = 0, count = 0, featureSum = 0, featureCount = 0, skinSum = 0, skinCount = 0;
  for (let k = 0; k < n * n; k++) {
    const x = (k % n) / (n - 1), y = Math.floor(k / n) / (n - 1);
    if (!inside("circle", x, y)) continue;
    for (let c = 0; c < 3; c++) { sum += (pixels[k * 3 + c] / 255 - raster[k * 3 + c]) ** 2; count++; }
    if (feature(x, y)) { featureSum += raster[k * 3]; featureCount++; }
    else if (Math.abs(x - .5) < .13 && y > .46 && y < .59) { skinSum += raster[k * 3]; skinCount++; }
  }
  expect(sum / count).toBeCloseTo(i.metrics.reconstructionMse, 7);
  expect(featureSum / featureCount).toBeLessThan(skinSum / skinCount - .08);
  const png = previewPng(i), decoded = decode(png.buffer as ArrayBuffer);
  const rgba = new Uint8Array(toRGBA8(decoded)[0]);
  expect(decoded.width).toBe(n);
  for (let k = 0; k < n * n; k++) expect(rgba[k * 4]).toBe(Math.round(raster[k * 3] * 255));
  expect(rasterSequence(i, 0)[0]).toBeCloseTo(250 / 255);
}, 30000);
