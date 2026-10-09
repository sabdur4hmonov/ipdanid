import { it, expect } from "vitest";
import {
  faceFeatures,
  reviewedFacePortrait,
  type SourceFace,
} from "../src/core/face-features";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { DEFAULT_EDITS } from "../src/core/types";
import { sourceToTarget } from "../src/core/coordinates";
const face: SourceFace = {
  face: { left: 0.2, top: 0.2, width: 0.6, height: 0.65 },
  eyes: { left: 0.28, top: 0.35, width: 0.44, height: 0.08 },
  nose: { left: 0.44, top: 0.47, width: 0.12, height: 0.15 },
  mouth: { left: 0.34, top: 0.68, width: 0.32, height: 0.06 },
};
it("rejects incomplete or nonfinite landmarks before creating anatomy suggestions", () => {
  expect(() => faceFeatures([])).toThrow();
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  points[61] = { x: NaN, y: 0.5 };
  expect(() => faceFeatures(points)).toThrow();
});
it("maps independent reviewed mouth and nose to sample centers at both resolutions and rotation", () => {
  for (const n of [160, 192]) {
    const edits = { ...DEFAULT_EDITS, zoom: 0.8, rotation: 9, panX: 0.015 };
    const result = reviewedFacePortrait(
      face,
      DEFAULT_PORTRAIT,
      edits,
      960,
      960,
      1,
      n,
    );
    for (const k of ["eyes", "nose", "mouth"] as const) {
      const b = face[k],
        box = result.regions![k];
      const corners = [
        [b.left, b.top],
        [b.left + b.width, b.top],
        [b.left, b.top + b.height],
        [b.left + b.width, b.top + b.height],
      ].map(([x, y]) =>
        sourceToTarget(x * 960, y * 960, 960, 960, edits, 1, n),
      );
      for (const p of corners) {
        expect(p.x).toBeGreaterThanOrEqual(box.left - 1e-12);
        expect(p.x).toBeLessThanOrEqual(box.left + box.width + 1e-12);
        expect(p.y).toBeGreaterThanOrEqual(box.top - 1e-12);
        expect(p.y).toBeLessThanOrEqual(box.top + box.height + 1e-12);
      }
    }
    expect(result.regions!.mouth.top).toBeGreaterThan(result.regions!.nose.top);
    expect(result.regions!.placement).toBe("manual");
    expect(DEFAULT_PORTRAIT.enabled).toBe(false);
  }
});
it("rejects a cropped face rather than shifting its features to unrelated pixels", () => {
  expect(() =>
    reviewedFacePortrait(
      face,
      DEFAULT_PORTRAIT,
      { ...DEFAULT_EDITS, zoom: 3 },
      960,
      960,
      1,
      160,
    ),
  ).toThrow(/Fit/);
});
it("rejects feature boxes outside a circle even when all coordinates fit the image rectangle", () => {
  const edits = { ...DEFAULT_EDITS, zoom: 0.5, panX: -0.28, panY: -0.28 };
  expect(() =>
    reviewedFacePortrait(
      face,
      DEFAULT_PORTRAIT,
      edits,
      960,
      960,
      1,
      160,
      "rectangle",
    ),
  ).not.toThrow();
  expect(() =>
    reviewedFacePortrait(
      face,
      DEFAULT_PORTRAIT,
      edits,
      960,
      960,
      1,
      160,
      "circle",
    ),
  ).toThrow(/inside the board/);
});
