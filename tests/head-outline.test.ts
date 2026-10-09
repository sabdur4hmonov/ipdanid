import { it, expect } from "vitest";
import {
  fitMarkedOutline,
  outlineBounds,
  validOutline,
} from "../src/core/head-outline";
import { fitMarkedFace, remapPortrait } from "../src/core/shape-crop";
import { sourceToTarget, targetToSource } from "../src/core/coordinates";
import { inside } from "../src/core/geometry";
import { DEFAULT_EDITS } from "../src/core/types";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
const head = Array.from({ length: 24 }, (_, i) => ({
  x: 0.5 + 0.29 * Math.cos((i * Math.PI) / 12),
  y: 0.46 + 0.35 * Math.sin((i * Math.PI) / 12),
}));
it("fits the marked boundary and interior with clearance, retaining one uniform source transform", () => {
  for (const shape of ["circle", "heart", "rectangle"] as const)
    for (const aspect of [0.8, 1.3]) {
      const e = { ...DEFAULT_EDITS, zoom: 0.9, rotation: 17 };
      const fit = fitMarkedOutline(
        shape,
        head,
        e,
        aspect,
        400,
        400 / aspect,
        960,
        1280,
        160,
      );
      const mapped = head.map((p) =>
        sourceToTarget(
          p.x * 960,
          p.y * 1280,
          960,
          1280,
          fit.edits,
          aspect,
          160,
        ),
      );
      for (let j = 0; j < mapped.length; j++)
        for (let k = 0; k <= 80; k++) {
          const a = mapped[j],
            b = mapped[(j + 1) % mapped.length],
            x = a.x + ((b.x - a.x) * k) / 80,
            y = a.y + ((b.y - a.y) * k) / 80;
          for (const [dx, dy] of [
            [0, 0],
            [4 / 400, 0],
            [-4 / 400, 0],
            [0, 4 / (400 / aspect)],
            [0, -4 / (400 / aspect)],
          ])
            if (!inside(shape, x + dx, y + dy))
              expect(
                false,
                JSON.stringify({
                  shape,
                  aspect,
                  j,
                  k,
                  x,
                  y,
                  dx,
                  dy,
                  fit,
                  bounds: outlineBounds(mapped),
                }),
              ).toBe(true);
        }
      const back = targetToSource(
        mapped[0].x,
        mapped[0].y,
        960,
        1280,
        fit.edits,
        aspect,
        160,
      );
      expect(back.x).toBeCloseTo(head[0].x * 960, 8);
      expect(back.y).toBeCloseTo(head[0].y * 1280, 8);
      expect(fit.edits.rotation).toBe(e.rotation);
      expect(outlineBounds(mapped).width).toBeCloseTo(fit.face.width, 8);
      // The fixture is a convex head polygon: radial combinations cover its interior,
      // independently checking the concave heart notch, not only marked vertices.
      const center = mapped.reduce(
        (s, p) => ({
          x: s.x + p.x / mapped.length,
          y: s.y + p.y / mapped.length,
        }),
        { x: 0, y: 0 },
      );
      for (const p of mapped)
        for (const fraction of [0.25, 0.5, 0.75]) {
          const x = center.x + (p.x - center.x) * fraction,
            y = center.y + (p.y - center.y) * fraction;
          expect(inside(shape, x, y)).toBe(true);
        }
    }
});
it("uses the round head instead of empty rectangle corners to allow more facial area", () => {
  const e = { ...DEFAULT_EDITS, zoom: 0.8 },
    board = head.map((p) =>
      sourceToTarget(p.x * 960, p.y * 1280, 960, 1280, e, 1, 160),
    );
  const rectangular = fitMarkedFace(
      "circle",
      outlineBounds(board),
      e,
      1,
      400,
      400,
      160,
    ),
    contour = fitMarkedOutline("circle", head, e, 1, 400, 400, 960, 1280, 160);
  expect(contour.ratio).toBeGreaterThan(rectangular.ratio * 1.1);
  const regions = {
    reference: "processed-target/sample-centers-v1" as const,
    placement: "manual" as const,
    eyes: { left: 0.4, top: 0.4, width: 0.2, height: 0.06 },
    nose: { left: 0.47, top: 0.5, width: 0.07, height: 0.1 },
    mouth: { left: 0.42, top: 0.65, width: 0.16, height: 0.05 },
  };
  const result = remapPortrait(
    { ...DEFAULT_PORTRAIT, regions },
    e,
    contour.edits,
    960,
    1280,
    1,
    160,
  );
  for (const key of ["eyes", "nose", "mouth"] as const) {
    const old = targetToSource(
        regions[key].left,
        regions[key].top,
        960,
        1280,
        e,
        1,
        160,
      ),
      next = targetToSource(
        result.regions![key].left,
        result.regions![key].top,
        960,
        1280,
        contour.edits,
        1,
        160,
      );
    expect(next.x).toBeCloseTo(old.x, 8);
    expect(next.y).toBeCloseTo(old.y, 8);
  }
});
it("rejects crossed, repeated, incomplete and nonfinite outlines rather than silently fitting them", () => {
  expect(() => validOutline(head.slice(0, 4))).toThrow();
  expect(() => validOutline([...head.slice(0, 5), head[4]])).toThrow();
  const crossed = [...head];
  [crossed[2], crossed[12]] = [crossed[12], crossed[2]];
  expect(() => validOutline(crossed)).toThrow();
  expect(() =>
    validOutline(head.map((p, i) => (i ? p : { x: NaN, y: p.y }))),
  ).toThrow();
});
