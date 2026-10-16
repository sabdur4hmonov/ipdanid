import type { RegionBox, Shape } from "./types";
import { faceFill, type FaceFill } from "./standard-preparation";
import type { PersonMask } from "./person-mask";
import { foregroundAlpha, validatePersonMask } from "./person-mask";

export function faceFillReference(
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
): FaceFill {
  if (
    !Array.isArray(faces) ||
    !faces.length ||
    faces.length > (shape === "heart" ? 2 : 3) ||
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    faces.some(
      (b) =>
        ![b.left, b.top, b.width, b.height].every(Number.isFinite) ||
        b.left < 0 ||
        b.top < 0 ||
        b.width <= 0 ||
        b.height <= 0 ||
        b.left + b.width > 1 ||
        b.top + b.height > 1,
    )
  )
    throw Error("classic2/face-count-or-bounds");
  // Detector boxes enclose facial skin, not hair. Expand actual reviewed boxes
  // before fitting the complete head. This changes framing, never facial pixels.
  const heads = faces.map((b) => {
    const l = Math.max(0, b.left - 0.15 * b.width),
      t = Math.max(0, b.top - 0.32 * b.height);
    return {
      left: l,
      top: t,
      width: Math.min(1, b.left + 1.15 * b.width) - l,
      height: Math.min(1, b.top + 1.13 * b.height) - t,
    };
  });
  const transform = faceFill(heads, shape, aspect),
    d = transform.targetBounds,
    s = transform.sourceBounds,
    factor = Math.min(1, 0.7 / Math.max(d.width, d.height)),
    w = d.width * factor,
    h = d.height * factor,
    targetBounds = {
      left: d.left + (d.width - w) / 2,
      top: d.top + (d.height - h) / 2,
      width: w,
      height: h,
    };
  return {
    ...transform,
    version: "reviewed-face-fill/2",
    faces: structuredClone(faces),
    targetBounds,
    targetFaces: faces.map((b) => ({
      left: targetBounds.left + ((b.left - s.left) / s.width) * w,
      top: targetBounds.top + ((b.top - s.top) / s.height) * h,
      width: (b.width / s.width) * w,
      height: (b.height / s.height) * h,
    })),
  };
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
function reflect(p: number, n: number): number {
  if (n === 1) return 0;
  while (p < 0 || p >= n) p = p < 0 ? -p : 2 * n - p - 2;
  return p;
}
// OpenCV CLAHE construction: reflect101 padding, clipped histogram with uniform
// redistribution and spaced residual bins, bilinear interpolation of 8x8 LUTs.
export function referenceClahe(
  gray: Uint8Array,
  width: number,
  height: number,
) {
  const padded = width % 8 !== 0 || height % 8 !== 0,
    tw = padded ? Math.floor(width / 8) + 1 : width / 8,
    th = padded ? Math.floor(height / 8) + 1 : height / 8,
    area = tw * th,
    limit = Math.max(1, Math.floor((2 * area) / 256)),
    luts: Uint8Array[] = [];
  for (let ty = 0; ty < 8; ty++)
    for (let tx = 0; tx < 8; tx++) {
      const hist = new Int32Array(256);
      let clipped = 0;
      for (let y = 0; y < th; y++)
        for (let x = 0; x < tw; x++)
          hist[
            gray[
              reflect(ty * th + y, height) * width + reflect(tx * tw + x, width)
            ]
          ]++;
      for (let i = 0; i < 256; i++)
        if (hist[i] > limit) {
          clipped += hist[i] - limit;
          hist[i] = limit;
        }
      const batch = Math.floor(clipped / 256);
      let residual = clipped - batch * 256;
      for (let i = 0; i < 256; i++) hist[i] += batch;
      if (residual) {
        const step = Math.max(1, Math.floor(256 / residual));
        for (let i = 0; i < 256 && residual > 0; i += step, residual--)
          hist[i]++;
      }
      const lut = new Uint8Array(256);
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        lut[i] = Math.min(255, Math.round((sum * 255) / area));
      }
      luts.push(lut);
    }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const xf = x / tw - 0.5,
        yf = y / th - 0.5,
        x0 = Math.floor(xf),
        y0 = Math.floor(yf),
        fx = xf - x0,
        fy = yf - y0,
        a = Math.max(0, x0),
        b = Math.min(7, x0 + 1),
        c = Math.max(0, y0),
        d = Math.min(7, y0 + 1),
        g = gray[y * width + x];
      out[y * width + x] =
        Math.round(
          (luts[c * 8 + a][g] * (1 - fx) + luts[c * 8 + b][g] * fx) * (1 - fy) +
            (luts[d * 8 + a][g] * (1 - fx) + luts[d * 8 + b][g] * fx) * fy,
        ) / 255;
    }
  return out;
}
export function referenceTones(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mask?: PersonMask,
) {
  if (mask) validatePersonMask(mask);
  const gray = new Uint8Array(width * height),
    alpha = new Float32Array(width * height).fill(1);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const k = y * width + x;
      gray[k] = Math.round(
        0.299 * rgba[k * 4] + 0.587 * rgba[k * 4 + 1] + 0.114 * rgba[k * 4 + 2],
      );
      if (mask) {
        const mx = Math.max(
            0,
            Math.min(mask.width - 1, ((x + 0.5) / width) * mask.width - 0.5),
          ),
          my = Math.max(
            0,
            Math.min(mask.height - 1, ((y + 0.5) / height) * mask.height - 0.5),
          ),
          ix = Math.floor(mx),
          iy = Math.floor(my),
          fx = mx - ix,
          fy = my - iy,
          a = mask.values[iy * mask.width + ix],
          b = mask.values[iy * mask.width + Math.min(mask.width - 1, ix + 1)],
          c = mask.values[Math.min(mask.height - 1, iy + 1) * mask.width + ix],
          d =
            mask.values[
              Math.min(mask.height - 1, iy + 1) * mask.width +
                Math.min(mask.width - 1, ix + 1)
            ];
        alpha[k] = foregroundAlpha(
          (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy,
        );
      }
    }
  const g = referenceClahe(gray, width, height),
    values = Array.from(g)
      .filter((_, k) => alpha[k] > 0.5)
      .sort((a, b) => a - b);
  if (!values.length) throw Error("classic2/empty-subject-mask");
  const percentile = (q: number) => {
      const i = (values.length - 1) * q,
        k = Math.floor(i);
      return (
        values[k] +
        (values[Math.min(k + 1, values.length - 1)] - values[k]) * (i - k)
      );
    },
    low = percentile(0.01),
    high = percentile(0.99),
    range = Math.max(1 / 255, high - low);
  for (let k = 0; k < g.length; k++) g[k] = clamp((g[k] - low) / range);
  const radius = 8,
    kernel = Float64Array.from({ length: 17 }, (_, j) =>
      Math.exp(-((j - radius) ** 2) / 8),
    ),
    sum = kernel.reduce((a, b) => a + b, 0);
  for (let j = 0; j < kernel.length; j++) kernel[j] /= sum;
  const horizontal = new Float32Array(g.length),
    blur = new Float32Array(g.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let j = -radius; j <= radius; j++)
        value += g[y * width + reflect(x + j, width)] * kernel[j + radius];
      horizontal[y * width + x] = value;
    }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let j = -radius; j <= radius; j++)
        value +=
          horizontal[reflect(y + j, height) * width + x] * kernel[j + radius];
      blur[y * width + x] = value;
    }
  for (let k = 0; k < g.length; k++)
    g[k] = clamp(g[k] + 0.6 * (g[k] - blur[k])) * alpha[k] + 1 - alpha[k];
  return { gray: g, alpha, low, high };
}
export function prepareReferenceCanvas(
  source: HTMLCanvasElement,
  mask: PersonMask | undefined,
  transform: FaceFill,
  n = 500,
) {
  const data = source
      .getContext("2d")!
      .getImageData(0, 0, source.width, source.height),
    tones = referenceTones(data.data, source.width, source.height, mask),
    full = document.createElement("canvas");
  full.width = source.width;
  full.height = source.height;
  const ctx = full.getContext("2d")!,
    image = ctx.createImageData(full.width, full.height);
  for (let k = 0; k < tones.gray.length; k++) {
    const v = Math.floor(tones.gray[k] * 255);
    image.data[k * 4] = image.data[k * 4 + 1] = image.data[k * 4 + 2] = v;
    image.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const target = canvas.getContext("2d")!,
    s = transform.sourceBounds,
    d = transform.targetBounds;
  target.fillStyle = "#fff";
  target.fillRect(0, 0, n, n);
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = "high";
  target.drawImage(
    full,
    s.left * full.width,
    s.top * full.height,
    s.width * full.width,
    s.height * full.height,
    d.left * n,
    d.top * n,
    d.width * n,
    d.height * n,
  );
  const result = target.getImageData(0, 0, n, n).data,
    pixels = Uint8Array.from(
      { length: n * n * 3 },
      (_, k) => result[Math.floor(k / 3) * 4 + (k % 3)],
    );
  return { canvas, pixels };
}
