import { it, expect } from "vitest";
import {
  fitMarkedFace,
  panCrop,
  zoomCrop,
  remapPortrait,
} from "../src/core/shape-crop";
import { inside } from "../src/core/geometry";
import { sourceToTarget, targetToSource } from "../src/core/coordinates";
import { DEFAULT_EDITS } from "../src/core/types";
import { DEFAULT_PORTRAIT, validPortrait } from "../src/core/portrait";
it("fits marked facial bounds inside the actual concave heart without warping the image", () => {
  const face = { left: 0.21, top: 0.18, width: 0.64, height: 0.73 },
    e = { ...DEFAULT_EDITS, zoom: 1.3 };
  const fit = fitMarkedFace("heart", face, e, 1, 400, 400, 160);
  for (let yi = 0; yi <= 40; yi++)
    for (let xi = 0; xi <= 40; xi++)
      expect(
        inside(
          "heart",
          fit.face.left + (fit.face.width * xi) / 40,
          fit.face.top + (fit.face.height * yi) / 40,
        ),
      ).toBe(true);
  expect(fit.face.width / fit.face.height).toBeCloseTo(
    face.width / face.height,
    10,
  );
  const old = JSON.stringify(e),
    mapped = remapPortrait(
      { ...DEFAULT_PORTRAIT, face },
      e,
      fit.edits,
      960,
      1280,
      1,
      160,
    );
  expect(mapped.face.left).toBeCloseTo(fit.face.left, 10);
  expect(mapped.face.top).toBeCloseTo(fit.face.top, 10);
  expect(mapped.face.width).toBeCloseTo(fit.face.width, 10);
  expect(JSON.stringify(e)).toBe(old);
  validPortrait(mapped);
});
it("drag and anchor zoom respect rotation, aspect and sample-center coordinates", () => {
  for (const aspect of [0.75, 1, 1.5])
    for (const rotation of [-90, 0, 37]) {
      const e = {
          ...DEFAULT_EDITS,
          zoom: 1.3,
          rotation,
          panX: 0.05,
          panY: -0.03,
        },
        p = sourceToTarget(430, 650, 960, 1280, e, aspect, 192);
      const dragged = sourceToTarget(
        430,
        650,
        960,
        1280,
        panCrop(e, 0.06, -0.04, aspect),
        aspect,
        192,
      );
      expect(dragged.x - p.x).toBeCloseTo((0.06 * 192) / 191, 10);
      expect(dragged.y - p.y).toBeCloseTo((-0.04 * 192) / 191, 10);
      const anchor = { x: (p.x * 191 + 0.5) / 192, y: (p.y * 191 + 0.5) / 192 };
      const zoomed = sourceToTarget(
        430,
        650,
        960,
        1280,
        zoomCrop(e, 1.1, anchor, aspect),
        aspect,
        192,
      );
      expect(zoomed.x).toBeCloseTo(p.x, 10);
      expect(zoomed.y).toBeCloseTo(p.y, 10);
    }
});
it("manual feature windows follow the same photo crop, including non-square boards", () => {
  const s = {
    ...DEFAULT_PORTRAIT,
    regions: {
      reference: "processed-target/sample-centers-v1" as const,
      placement: "manual" as const,
      eyes: { left: 0.3, top: 0.36, width: 0.35, height: 0.08 },
      nose: { left: 0.4, top: 0.46, width: 0.15, height: 0.13 },
      mouth: { left: 0.34, top: 0.65, width: 0.3, height: 0.07 },
    },
  };
  const old = { ...DEFAULT_EDITS, rotation: 25 },
    next = panCrop(
      zoomCrop(old, 0.9, { x: 0.5, y: 0.5 }, 1.4),
      0.02,
      0.03,
      1.4,
    ),
    mapped = remapPortrait(s, old, next, 960, 1280, 1.4, 192);
  for (const key of ["eyes", "nose", "mouth"] as const) {
    const b = s.regions[key],
      p = targetToSource(b.left, b.top, 960, 1280, old, 1.4, 192),
      q = sourceToTarget(p.x, p.y, 960, 1280, next, 1.4, 192);
    expect(mapped.regions![key].left).toBeCloseTo(q.x, 10);
    expect(mapped.regions![key].top).toBeCloseTo(q.y, 10);
  }
  expect(mapped.regions!.placement).toBe("manual");
  validPortrait(mapped);
});
