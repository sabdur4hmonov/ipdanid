import { expect, test } from "vitest";
import {
  faceOvalMask,
  portraitViewingImage,
  viewingImage,
  viewingSsimPrepared,
  VIEW_SIZE,
} from "../src/core/viewing-ssim";
import type { RegionBox } from "../src/core/types";

const cases: RegionBox[][] = [
  [{ left: 0.27, top: 0.32, width: 0.47, height: 0.56 }],
  [{ left: -0.08, top: -0.06, width: 0.4, height: 0.5 }],
  [{ left: 0.76, top: 0.7, width: 0.35, height: 0.4 }],
  [
    { left: 0.12, top: 0.08, width: 0.21, height: 0.4 },
    { left: 0.64, top: 0.1, width: 0.22, height: 0.41 },
  ],
  [
    { left: 0.03, top: 0.18, width: 0.2, height: 0.3 },
    { left: 0.38, top: 0.2, width: 0.2, height: 0.3 },
    { left: 0.77, top: 0.15, width: 0.2, height: 0.3 },
  ],
  [{ left: 0, top: 0, width: 1, height: 1 }],
];
const fixture = (n: number, shift: number) =>
  Float32Array.from({ length: n * n }, (_, k) =>
    Math.fround(
      0.5 +
        0.18 * Math.sin((k % n) * 0.031 + shift) +
        0.19 * Math.cos(Math.floor(k / n) * 0.049),
    ),
  );
const regions = (faces: RegionBox[]) =>
  faces.flatMap((f) =>
    [
      [0.3, 0.35, 0.4, 0.4],
      [0.1, 0.18, 0.8, 0.24],
      [0.2, 0.7, 0.6, 0.23],
    ].map(([x, y, w, h]) => ({
      left: f.left + x * f.width,
      top: f.top + y * f.height,
      width: w * f.width,
      height: h * f.height,
    })),
  );

test("portrait-only blur keeps exact Float32 pixels throughout all local-SSIM halos at both physical sizes", () => {
  for (const n of [500, 1000]) {
    const input = fixture(n, 0),
      full = viewingImage(input, n);
    for (const faces of cases) {
      const partial = portraitViewingImage(input, n, faces);
      for (const face of faces) {
        const mask = faceOvalMask(face);
        for (let k = 0; k < mask.length; k++)
          if (mask[k]) {
            const x = k % VIEW_SIZE,
              y = Math.floor(k / VIEW_SIZE);
            for (let dy = -3; dy <= 3; dy++)
              for (let dx = -3; dx <= 3; dx++) {
                // Same REFLECT_101 neighborhood used by the local SSIM kernel.
                const reflect = (i: number) =>
                  i < 0 ? -i : i >= VIEW_SIZE ? 2 * VIEW_SIZE - i - 2 : i;
                const j = reflect(y + dy) * VIEW_SIZE + reflect(x + dx);
                if (partial[j] !== full[j])
                  throw Error(`non-exact halo ${n}/${j}`);
              }
          }
      }
    }
  }
}, 30000);

test("portrait face, feature and correlation scores equal the full physical-image calculation, including clipped and multiple faces", () => {
  const a = fixture(500, 0),
    b = fixture(1000, 0.2),
    fullA = viewingImage(a, 500),
    fullB = viewingImage(b, 1000),
    boardMask = new Uint8Array(160 * 160).fill(1);
  for (const faces of cases) {
    const options = { faces, regions: regions(faces), boardMask };
    const old = viewingSsimPrepared(fullA, fullB, options),
      actual = viewingSsimPrepared(
        portraitViewingImage(a, 500, faces),
        portraitViewingImage(b, 1000, faces),
        options,
      );
    expect(actual.faces).toEqual(old.faces);
    expect(actual.face).toEqual(old.face);
    expect(actual.regions).toEqual(old.regions);
    // The partial image is deliberately NOT used to report a global SSIM.
  }
}, 30000);

test("empty, invalid and outside portrait windows preserve the original full-image validation/fallback", () => {
  const a = fixture(160, 0),
    full = viewingImage(a, 160);
  for (const faces of [
    [],
    [{ left: NaN, top: 0, width: 1, height: 1 }],
    [{ left: 0, top: 0, width: 0, height: 1 }],
    [{ left: 2, top: 2, width: 0.1, height: 0.1 }],
  ])
    expect(portraitViewingImage(a, 160, faces)).toEqual(full);
  expect(() =>
    portraitViewingImage(new Float32Array(4), 500, cases[0]),
  ).toThrow("input");
  a[0] = NaN;
  expect(() => portraitViewingImage(a, 160, cases[0])).toThrow("input");
});
