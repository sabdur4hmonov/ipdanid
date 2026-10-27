import type { RegionBox } from "./types";

// Port of AGENT/reference/score-viewing-ssim.py's executed arithmetic.
// No brightness/contrast normalization: the reference only comments about it.
// Border = OpenCV BORDER_REFLECT_101, resize = true pixel-area integration.
export const VIEW_SIZE = 160;
const f = Math.fround;
function reflect(i: number, n: number): number {
  while (i < 0 || i >= n) i = i < 0 ? -i : 2 * n - i - 2;
  return i;
}
// At most four small address tables, independent of photo data.
const gaussianTaps = new Map<string, { x: Uint32Array; y: Float64Array }>();
function gaussianAddresses(n: number, size: number, radius: number) {
  const key = `${n}:${size}`;
  const previous = gaussianTaps.get(key);
  if (previous) return previous;
  const x = new Uint32Array(n * size),
    y = new Float64Array(n * size);
  for (let p = 0; p < n; p++)
    for (let k = 0; k < size; k++) {
      const index = reflect(p + k - radius, n);
      x[p * size + k] = index;
      y[p * size + k] = index * n;
    }
  if (gaussianTaps.size >= 4)
    gaussianTaps.delete(gaussianTaps.keys().next().value!);
  const result = { x, y };
  gaussianTaps.set(key, result);
  return result;
}
type ViewingWindow = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
function gaussian(
  a: Float32Array,
  n: number,
  sigma: number,
  width?: number,
  window?: ViewingWindow,
) {
  const size = width ?? Math.round(sigma * 8 + 1) | 1,
    radius = (size - 1) / 2,
    kernel = Float64Array.from({ length: size }, (_, i) =>
      Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)),
    ),
    sum = kernel.reduce((x, y) => x + y, 0);
  for (let i = 0; i < size; i++) kernel[i] = f(kernel[i] / sum);
  const taps = gaussianAddresses(n, size, radius);
  const row = new Float32Array(a.length),
    out = new Float32Array(a.length);
  const left = window?.left ?? 0,
    right = window?.right ?? n - 1,
    top = window?.top ?? 0,
    bottom = window?.bottom ?? n - 1;
  // Keep every horizontal row needed by the vertical kernel, including the
  // reflected boundary rows. Accumulation order and Float32 rounding are exact.
  for (
    let y = Math.max(0, top - radius);
    y <= Math.min(n - 1, bottom + radius);
    y++
  )
    for (let x = left; x <= right; x++) {
      let v = 0;
      for (let k = 0; k < size; k++)
        v += a[y * n + taps.x[x * size + k]] * kernel[k];
      row[y * n + x] = v;
    }
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      let v = 0;
      for (let k = 0; k < size; k++)
        v += row[taps.y[y * size + k] + x] * kernel[k];
      out[y * n + x] = v;
    }
  return out;
}
function imageWindow(a: Float32Array, n: number, window?: ViewingWindow) {
  if (a.length !== n * n || n < 160 || !a.every(Number.isFinite))
    throw Error("viewing-ssim/input");
  const scale = n / VIEW_SIZE,
    bounds = window
      ? {
          left: Math.floor(window.left * scale),
          right: Math.min(n - 1, Math.ceil((window.right + 1) * scale) - 1),
          top: Math.floor(window.top * scale),
          bottom: Math.min(n - 1, Math.ceil((window.bottom + 1) * scale) - 1),
        }
      : undefined,
    blurred = gaussian(a, n, (n / VIEW_SIZE) * 0.6, undefined, bounds);
  const taps = Array.from({ length: VIEW_SIZE }, (_, x) => {
    const lo = x * scale,
      hi = (x + 1) * scale,
      out: { i: number; w: number }[] = [];
    for (let i = Math.floor(lo); i < Math.ceil(hi); i++)
      out.push({ i, w: (Math.min(hi, i + 1) - Math.max(lo, i)) / scale });
    return out;
  });
  const out = new Float32Array(VIEW_SIZE * VIEW_SIZE);
  for (let y = window?.top ?? 0; y <= (window?.bottom ?? VIEW_SIZE - 1); y++)
    for (
      let x = window?.left ?? 0;
      x <= (window?.right ?? VIEW_SIZE - 1);
      x++
    ) {
      let v = 0;
      for (const ty of taps[y])
        for (const tx of taps[x]) v += blurred[ty.i * n + tx.i] * ty.w * tx.w;
      out[y * VIEW_SIZE + x] = v;
    }
  return out;
}
export function viewingImage(a: Float32Array, n: number) {
  return imageWindow(a, n);
}

// Only for portrait selection's face/nose/eyes/mouth measurements. Pixels in
// these regions (plus the 7x7 SSIM kernel halo) are bit-identical to the full
// viewing image. Outside the halo is zero: NEVER use this for a global score.
// White-background coverage is still measured separately on the full raster.
export function portraitViewingImage(
  a: Float32Array,
  n: number,
  faces: RegionBox[],
) {
  if (
    !faces.length ||
    faces.some(
      (f) =>
        ![f.left, f.top, f.width, f.height].every(Number.isFinite) ||
        f.width <= 0 ||
        f.height <= 0,
    )
  )
    return viewingImage(a, n);
  const left = Math.max(
      0,
      Math.floor(Math.min(...faces.map((f) => f.left)) * VIEW_SIZE) - 4,
    ),
    right = Math.min(
      VIEW_SIZE - 1,
      Math.ceil(Math.max(...faces.map((f) => f.left + f.width)) * VIEW_SIZE) +
        4,
    ),
    top = Math.max(
      0,
      Math.floor(Math.min(...faces.map((f) => f.top)) * VIEW_SIZE) - 4,
    ),
    bottom = Math.min(
      VIEW_SIZE - 1,
      Math.ceil(Math.max(...faces.map((f) => f.top + f.height)) * VIEW_SIZE) +
        4,
    );
  return imageWindow(
    a,
    n,
    left <= right && top <= bottom ? { left, right, top, bottom } : undefined,
  );
}
export function faceOvalMask(face?: RegionBox) {
  const cx = face ? VIEW_SIZE * (face.left + face.width / 2) : 80,
    cy = face ? VIEW_SIZE * (face.top + face.height / 2) : 96,
    rx = face ? (VIEW_SIZE * face.width) / 2 : 38,
    ry = face ? (VIEW_SIZE * face.height) / 2 : 45;
  if (!(rx > 0 && ry > 0)) throw Error("viewing-ssim/face");
  return Uint8Array.from({ length: VIEW_SIZE * VIEW_SIZE }, (_, k) =>
    (((k % VIEW_SIZE) - cx) / rx) ** 2 +
      ((Math.floor(k / VIEW_SIZE) - cy) / ry) ** 2 <
    1
      ? 1
      : 0,
  );
}
export function viewingSsim(
  target: Float32Array,
  targetSize: number,
  render: Float32Array,
  renderSize: number,
  options: { faces?: RegionBox[]; boardMask?: Uint8Array } = {},
) {
  return viewingSsimPrepared(
    viewingImage(render, renderSize),
    viewingImage(target, targetSize),
    options,
  );
}
export function viewingSsimPrepared(
  a: Float32Array,
  b: Float32Array,
  options: {
    faces?: RegionBox[];
    boardMask?: Uint8Array;
    regions?: RegionBox[];
  } = {},
) {
  if (a.length !== VIEW_SIZE ** 2 || b.length !== VIEW_SIZE ** 2)
    throw Error("viewing-ssim/prepared-size");
  const n = VIEW_SIZE,
    mu1 = gaussian(a, n, 1.5, 7),
    mu2 = gaussian(b, n, 1.5, 7),
    sq1 = gaussian(
      Float32Array.from(a, (v) => f(v * v)),
      n,
      1.5,
      7,
    ),
    sq2 = gaussian(
      Float32Array.from(b, (v) => f(v * v)),
      n,
      1.5,
      7,
    ),
    cross = gaussian(
      Float32Array.from(a, (v, i) => f(v * b[i])),
      n,
      1.5,
      7,
    ),
    map = new Float32Array(n * n);
  for (let i = 0; i < map.length; i++) {
    const m1 = f(mu1[i] * mu1[i]),
      m2 = f(mu2[i] * mu2[i]),
      m12 = f(mu1[i] * mu2[i]),
      v1 = f(sq1[i] - m1),
      v2 = f(sq2[i] - m2),
      c = f(cross[i] - m12);
    map[i] = f(
      f(f(f(2 * m12) + 0.0001) * f(f(2 * c) + 0.0009)) /
        f(f(f(m1 + m2) + 0.0001) * f(f(v1 + v2) + 0.0009)),
    );
  }
  const allMask =
    options.boardMask ??
    Uint8Array.from({ length: n * n }, (_, k) =>
      ((k % n) - 79.5) ** 2 + (Math.floor(k / n) - 79.5) ** 2 < 78 ** 2 ? 1 : 0,
    );
  if (allMask.length !== n * n) throw Error("viewing-ssim/mask");
  const masks = options.faces?.length
      ? options.faces.map(faceOvalMask)
      : [faceOvalMask()],
    union = new Uint8Array(n * n);
  for (const mask of masks)
    for (let i = 0; i < mask.length; i++) {
      mask[i] &= allMask[i];
      union[i] |= mask[i];
    }
  const measure = (mask: Uint8Array) => {
    let pixels = 0,
      sum = 0,
      sa = 0,
      sb = 0;
    for (let i = 0; i < mask.length; i++)
      if (mask[i]) {
        pixels++;
        sum += map[i];
        sa += a[i];
        sb += b[i];
      }
    if (!pixels) throw Error("viewing-ssim/empty-face");
    const ma = sa / pixels,
      mb = sb / pixels;
    let va = 0,
      vb = 0,
      cov = 0;
    for (let i = 0; i < mask.length; i++)
      if (mask[i]) {
        const x = a[i] - ma,
          y = b[i] - mb;
        va += x * x;
        vb += y * y;
        cov += x * y;
      }
    return {
      ssim: sum / pixels,
      correlation: va && vb ? cov / Math.sqrt(va * vb) : null,
      pixels,
    };
  };
  return {
    version: "viewing-ssim/1" as const,
    size: n,
    all: measure(allMask),
    face: measure(union),
    faces: masks.map(measure),
    ...(options.regions
      ? {
          regions: options.regions.map((b) => {
            const mask = faceOvalMask(b);
            for (let k = 0; k < mask.length; k++) mask[k] &= allMask[k];
            return measure(mask);
          }),
        }
      : {}),
  };
}
