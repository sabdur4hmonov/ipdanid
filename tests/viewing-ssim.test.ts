import { test, expect } from "vitest";
import golden from "./fixtures/viewing-ssim-golden.json";
import { viewingSsim } from "./helpers/viewing-ssim";

function fixture(n: number, render: boolean) {
  return Float32Array.from({ length: n * n }, (_, k) => {
    const x = ((k % n) * 500) / n,
      y = (Math.floor(k / n) * 500) / n;
    return Math.min(
      1,
      Math.max(
        0,
        0.62 +
          0.16 * Math.sin((x + 3 + (render ? 4 : 0)) * 0.043) +
          0.13 * Math.cos((y + 7) * 0.071) -
          0.2 * Math.exp(-((x - 260) ** 2 + (y - 285) ** 2) / 17000) +
          (render ? 0.035 * Math.sin(x * 0.5) * Math.cos(y * 0.37) : 0),
      ),
    );
  });
}
test("viewing-distance SSIM reproduces OpenCV Gaussian/area/oval arithmetic without tone normalization", () => {
  const t = fixture(500, false),
    r = fixture(1000, true),
    actual = viewingSsim(t, 500, r, 1000);
  expect(actual.face.ssim).toBeCloseTo(golden.faceSsim, 4);
  expect(actual.all.ssim).toBeCloseTo(golden.allSsim, 4);
  expect(actual.face.correlation!).toBeCloseTo(golden.correlation, 5);
  expect(actual.face.pixels).toBe(golden.facePixels);
  expect(actual.all.pixels).toBe(golden.allPixels);
  const same = viewingSsim(t, 500, t, 500);
  expect(same.face.ssim).toBe(1);
  // Viewer adaptation is not executed in the Python: a brightness shift is penalized.
  expect(
    viewingSsim(
      t,
      500,
      Float32Array.from(t, (v) => v * 0.8),
      500,
    ).face.ssim,
  ).toBeLessThan(0.98);
});
test("two reviewed face ovals report both people and reject empty/invalid input", () => {
  const a = fixture(500, false),
    faces = [
      { left: 0.17, top: 0.14, width: 0.25, height: 0.42 },
      { left: 0.58, top: 0.14, width: 0.25, height: 0.42 },
    ],
    result = viewingSsim(a, 500, a, 500, { faces });
  expect(result.faces).toHaveLength(2);
  for (const f of result.faces) {
    expect(f.pixels).toBeGreaterThan(100);
    expect(f.ssim).toBe(1);
  }
  expect(() => viewingSsim(new Float32Array(4), 500, a, 500)).toThrow("input");
  expect(() =>
    viewingSsim(a, 500, a, 500, { boardMask: new Uint8Array(160 * 160) }),
  ).toThrow("empty");
});
