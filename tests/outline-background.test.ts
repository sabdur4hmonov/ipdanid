import { it, expect } from "vitest";
import {
  outlineBackgroundMask,
  inOutline,
} from "../src/core/outline-background";
import { sourceToTarget } from "../src/core/coordinates";
import {
  processPortrait,
  DEFAULT_PORTRAIT,
  paintBackgroundMask,
} from "../src/core/portrait";
import { DEFAULT_EDITS } from "../src/core/types";
const head = Array.from({ length: 24 }, (_, i) => ({
  x: 0.5 + 0.23 * Math.cos((i * Math.PI) / 12),
  y: 0.46 + 0.28 * Math.sin((i * Math.PI) / 12),
}));
it("whitens external texture while keeping every selected head pixel exact after rotation, crop and mask blur", () => {
  for (const n of [160, 192])
    for (const rotation of [0, 17]) {
      const edits = { ...DEFAULT_EDITS, zoom: 0.9, rotation },
        polygon = head.map((p) =>
          sourceToTarget(p.x * 960, p.y * 1280, 960, 1280, edits, 1, n),
        );
      const raw = Uint8Array.from(
          { length: n * n * 3 },
          (_, i) => 40 + (i % 180),
        ),
        portrait = { ...DEFAULT_PORTRAIT, enabled: true };
      const before = processPortrait(raw, n, portrait),
        after = processPortrait(raw, n, {
          ...portrait,
          backgroundMode: "manual-light",
          backgroundMask: outlineBackgroundMask(head, edits, 1, 960, 1280, n),
        });
      let preserved = 0,
        lightened = 0;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = (y * n + x) * 3;
          if (inOutline({ x: x / (n - 1), y: y / (n - 1) }, polygon)) {
            expect(Array.from(after.subarray(i, i + 3))).toEqual(
              Array.from(before.subarray(i, i + 3)),
            );
            preserved++;
          } else if (after[i] > before[i]) lightened++;
        }
      expect(preserved).toBeGreaterThan(1000);
      expect(lightened).toBeGreaterThan(1000);
    }
});
it("rejects incomplete/intersecting selection and regenerates for changed crop", () => {
  expect(() =>
    outlineBackgroundMask(head.slice(0, 3), DEFAULT_EDITS, 1, 960, 1280, 160),
  ).toThrow();
  const crossed = [head[0], head[12], head[1], head[13], head[2], head[14]];
  expect(() =>
    outlineBackgroundMask(crossed, DEFAULT_EDITS, 1, 960, 1280, 160),
  ).toThrow();
  expect(
    outlineBackgroundMask(head, DEFAULT_EDITS, 1, 960, 1280, 160),
  ).not.toBe(
    outlineBackgroundMask(
      head,
      { ...DEFAULT_EDITS, panX: 0.1 },
      1,
      960,
      1280,
      160,
    ),
  );
});
it("keeps earlier manual head corrections when adding an external mask", () => {
  const n = 160,
    raw = new Uint8Array(n * n * 3).fill(80),
    edits = DEFAULT_EDITS;
  const portrait = {
    ...DEFAULT_PORTRAIT,
    enabled: true,
    backgroundMode: "manual-light" as const,
    backgroundMask: paintBackgroundMask(undefined, 0.5, 0.5, 0.06, false),
    foregroundMask: paintBackgroundMask(undefined, 0.47, 0.5, 0.02, false),
  };
  const before = processPortrait(raw, n, portrait),
    after = processPortrait(raw, n, {
      ...portrait,
      backgroundMask: outlineBackgroundMask(
        head,
        edits,
        1,
        960,
        1280,
        n,
        portrait.backgroundMask,
      ),
    }),
    polygon = head.map((p) =>
      sourceToTarget(p.x * 960, p.y * 1280, 960, 1280, edits, 1, n),
    );
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (inOutline({ x: x / (n - 1), y: y / (n - 1) }, polygon))
        expect(
          Array.from(after.subarray((y * n + x) * 3, (y * n + x + 1) * 3)),
        ).toEqual(
          Array.from(before.subarray((y * n + x) * 3, (y * n + x + 1) * 3)),
        );
});
