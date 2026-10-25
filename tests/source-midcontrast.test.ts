import { test, expect } from "vitest";
import { sourceMidcontrast } from "../scripts/source-midcontrast";
test("source contrast does not invent structure in flat fields or white background", () => {
  for (const v of [0, 70, 180, 250, 255]) {
    const p = new Uint8Array(32 * 32 * 3).fill(v);
    expect(sourceMidcontrast(p, 32)).toEqual(p);
  }
});
test("fixed dark band comes from source structure; bright pixels and geometry stay unchanged", () => {
  const p = new Uint8Array(64 * 64 * 3).fill(255);
  for (let y = 16; y < 48; y++)
    for (let x = 16; x < 48; x++)
      for (let c = 0; c < 3; c++)
        p[(y * 64 + x) * 3 + c] = x > 29 && x < 35 ? 80 : 180;
  const q = sourceMidcontrast(p, 64);
  let strengthened = 0;
  for (let k = 0; k < p.length; k++) {
    expect(q[k]).toBeLessThanOrEqual(p[k]);
    if (p[k] >= 250) expect(q[k]).toBe(p[k]);
    if (q[k] < p[k]) strengthened++;
  }
  expect(strengthened).toBeGreaterThan(0);
  expect(q).toHaveLength(p.length);
});
