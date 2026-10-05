import type { PortraitSettings, RegionBox, MaterialProfile } from "./types";
import { inside } from "./geometry";
export const DEFAULT_PORTRAIT: PortraitSettings = {
  enabled: false,
  face: { left: 0.27, top: 0.32, width: 0.5, height: 0.6 },
  background: 0.75,
  localContrast: 0.35,
};
export function portraitRegions(
  settings: RegionBox | PortraitSettings,
): Record<string, RegionBox> {
  const face = "face" in settings ? settings.face : settings;
  const custom = "face" in settings ? settings.regions : undefined;
  const part = (left: number, top: number, width: number, height: number) => ({
    left: face.left + left * face.width,
    top: face.top + top * face.height,
    width: width * face.width,
    height: height * face.height,
  });
  return {
    face,
    eyes: custom?.eyes ?? part(0.08, 0.23, 0.84, 0.18),
    nose: custom?.nose ?? part(0.27, 0.4, 0.46, 0.28),
    mouth: custom?.mouth ?? part(0.18, 0.67, 0.64, 0.18),
    outline: face,
  };
}
export function contains(box: RegionBox, x: number, y: number) {
  return (
    x >= box.left &&
    x <= box.left + box.width &&
    y >= box.top &&
    y <= box.top + box.height
  );
}
export function validPortrait(s: PortraitSettings) {
  const f = s?.face;
  if (
    typeof s?.enabled !== "boolean" ||
    !f ||
    ![f.left, f.top, f.width, f.height, s.background, s.localContrast].every(
      Number.isFinite,
    ) ||
    f.left < 0 ||
    f.top < 0 ||
    f.width < 0.1 ||
    f.height < 0.1 ||
    f.left + f.width > 1.00001 ||
    f.top + f.height > 1.00001 ||
    s.background < 0 ||
    s.background > 1 ||
    s.localContrast < 0 ||
    s.localContrast > 1
  )
    throw new Error("Invalid portrait region");
  if (s.regions !== undefined) {
    if (s.regions.reference !== "processed-target/sample-centers-v1")
      throw new Error("Invalid portrait coordinate reference");
    if (
      s.regions.placement !== undefined &&
      !["manual", "proportional-estimate"].includes(s.regions.placement)
    )
      throw new Error("Invalid region placement method");
    for (const key of ["eyes", "nose", "mouth"] as const) {
      const b = s.regions[key];
      if (
        !b ||
        ![b.left, b.top, b.width, b.height].every(Number.isFinite) ||
        b.left < 0 ||
        b.top < 0 ||
        b.width < 0.01 ||
        b.height < 0.01 ||
        b.left + b.width > 1.00001 ||
        b.top + b.height > 1.00001
      )
        throw new Error("Invalid manual portrait region");
    }
  }
  if (
    s.backgroundMode !== undefined &&
    !["soften", "manual-light"].includes(s.backgroundMode)
  )
    throw new Error("Invalid background mode");
  for (const mask of [s.backgroundMask, s.foregroundMask])
    if (
      mask !== undefined &&
      (typeof mask !== "string" || !/^[0-9a-f]{1024}$/.test(mask))
    )
      throw new Error("Invalid background mask");
}
export function snapshotPortrait(s: PortraitSettings): PortraitSettings {
  const copy = structuredClone(s);
  if (copy.enabled && !copy.regions) {
    const b = portraitRegions(copy);
    copy.regions = {
      reference: "processed-target/sample-centers-v1",
      placement: "proportional-estimate",
      eyes: b.eyes,
      nose: b.nose,
      mouth: b.mouth,
    };
  }
  return copy;
}
export const MASK_SIZE = 64;
export const EMPTY_BACKGROUND_MASK = "0".repeat(1024);
export function decodeBackgroundMask(mask = EMPTY_BACKGROUND_MASK) {
  if (!/^[0-9a-f]{1024}$/.test(mask))
    throw new Error("Invalid background mask");
  return Float32Array.from(
    { length: MASK_SIZE ** 2 },
    (_, i) => (parseInt(mask[Math.floor(i / 4)], 16) >> (3 - (i % 4))) & 1,
  );
}
export function encodeBackgroundMask(values: ArrayLike<number>) {
  if (values.length !== MASK_SIZE ** 2) throw new Error("Invalid mask size");
  let result = "";
  for (let i = 0; i < values.length; i += 4) {
    let v = 0;
    for (let j = 0; j < 4; j++) v = v * 2 + (values[i + j] >= 0.5 ? 1 : 0);
    result += v.toString(16);
  }
  return result;
}
export function paintBackgroundMask(
  mask: string | undefined,
  x: number,
  y: number,
  radius: number,
  erase: boolean,
) {
  if (
    ![x, y, radius].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    x > 1 ||
    y > 1 ||
    radius < 0.005 ||
    radius > 0.25
  )
    throw new Error("Invalid background brush");
  const values = decodeBackgroundMask(mask);
  for (let py = 0; py < MASK_SIZE; py++)
    for (let px = 0; px < MASK_SIZE; px++)
      if (
        Math.hypot(px / (MASK_SIZE - 1) - x, py / (MASK_SIZE - 1) - y) <= radius
      )
        values[py * MASK_SIZE + px] = erase ? 1 : 0;
  return encodeBackgroundMask(values);
}
function blur(input: Float32Array, n: number, r: number) {
  const temp = new Float32Array(input.length),
    out = new Float32Array(input.length);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let a = 0,
        c = 0;
      for (let j = Math.max(0, x - r); j <= Math.min(n - 1, x + r); j++) {
        a += input[y * n + j];
        c++;
      }
      temp[y * n + x] = a / c;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let a = 0,
        c = 0;
      for (let j = Math.max(0, y - r); j <= Math.min(n - 1, y + r); j++) {
        a += temp[j * n + x];
        c++;
      }
      out[y * n + x] = a / c;
    }
  return out;
}
// Pixel-only preparation: no face synthesis, landmark detection or change in geometry.
export function processPortrait(
  input: Uint8Array,
  n: number,
  s: PortraitSettings,
): Uint8Array {
  validPortrait(s);
  if (!s.enabled) return input.slice();
  const gray = Float32Array.from(
    { length: n * n },
    (_, i) =>
      (0.2126 * input[i * 3] +
        0.7152 * input[i * 3 + 1] +
        0.0722 * input[i * 3 + 2]) /
      255,
  );
  const local = blur(gray, n, Math.max(2, Math.round(n * 0.04))),
    background = blur(gray, n, Math.max(3, Math.round(n * 0.08))),
    out = new Uint8Array(input.length),
    f = s.face;
  // Expanded oval includes useful hair/chin around the manually selected face. Feathering avoids a cut-out edge.
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x,
        nx = x / (n - 1),
        ny = y / (n - 1);
      const d = Math.hypot(
        (nx - (f.left + f.width / 2)) / (f.width * 0.85),
        (ny - (f.top + f.height * 0.28)) / (f.height * 0.95),
      );
      const fade = Math.max(0, Math.min(1, (d - 0.85) / 0.35)) * s.background;
      const enhancement = Math.max(
        -0.055,
        Math.min(0.055, (gray[i] - local[i]) * s.localContrast),
      );
      const value = Math.max(
        0,
        Math.min(
          1,
          (gray[i] + enhancement) * (1 - fade) +
            (background[i] * 0.35 + 0.65) * fade,
        ),
      );
      for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(value * 255);
    }
  if (
    s.backgroundMode === "manual-light" &&
    s.backgroundMask &&
    s.background > 0
  ) {
    // Only explicitly painted pixels change. Bright foreground is never inferred as background.
    const mask = blur(decodeBackgroundMask(s.backgroundMask), MASK_SIZE, 1);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const mx = (x / (n - 1)) * (MASK_SIZE - 1),
          my = (y / (n - 1)) * (MASK_SIZE - 1);
        const x0 = Math.floor(mx),
          y0 = Math.floor(my),
          x1 = Math.min(x0 + 1, MASK_SIZE - 1),
          y1 = Math.min(y0 + 1, MASK_SIZE - 1);
        const a = mx - x0,
          b = my - y0;
        const fade =
          s.background *
          ((1 - b) *
            ((1 - a) * mask[y0 * MASK_SIZE + x0] +
              a * mask[y0 * MASK_SIZE + x1]) +
            b *
              ((1 - a) * mask[y1 * MASK_SIZE + x0] +
                a * mask[y1 * MASK_SIZE + x1]));
        for (let c = 0; c < 3; c++) {
          const i = (y * n + x) * 3 + c;
          out[i] = Math.round(out[i] * (1 - fade) + 255 * fade);
        }
      }
  }
  if (s.backgroundMode === "manual-light" && s.foregroundMask) {
    const mask = blur(decodeBackgroundMask(s.foregroundMask), MASK_SIZE, 1);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const mx = (x / (n - 1)) * (MASK_SIZE - 1),
          my = (y / (n - 1)) * (MASK_SIZE - 1),
          x0 = Math.floor(mx),
          y0 = Math.floor(my),
          x1 = Math.min(x0 + 1, MASK_SIZE - 1),
          y1 = Math.min(y0 + 1, MASK_SIZE - 1),
          a = mx - x0,
          b = my - y0;
        const restore =
          (1 - b) *
            ((1 - a) * mask[y0 * MASK_SIZE + x0] +
              a * mask[y0 * MASK_SIZE + x1]) +
          b *
            ((1 - a) * mask[y1 * MASK_SIZE + x0] +
              a * mask[y1 * MASK_SIZE + x1]);
        const i = y * n + x,
          enhancement = Math.max(
            -0.055,
            Math.min(0.055, (gray[i] - local[i]) * s.localContrast),
          );
        // Recover the original grayscale/contrast pixels, including regions softened by the oval.
        const original = Math.round(
          Math.max(0, Math.min(1, gray[i] + enhancement)) * 255,
        );
        for (let c = 0; c < 3; c++)
          out[i * 3 + c] = Math.round(
            out[i * 3 + c] * (1 - restore) + original * restore,
          );
      }
  }
  return out;
}
export function putRgb(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8Array,
  n: number,
) {
  const d = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    d.data.set(pixels.subarray(i * 3, i * 3 + 3), i * 4);
    d.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
}
export function regionMeasurements(
  target: Uint8Array,
  raster: Float32Array,
  n: number,
  p: MaterialProfile,
  settings: RegionBox | PortraitSettings,
) {
  const face = "face" in settings ? settings.face : settings;
  const result: Record<
    string,
    { mse: number; edgeMse: number; pixels: number }
  > = {};
  for (const [name, box] of Object.entries(portraitRegions(settings))) {
    let sum = 0,
      edge = 0,
      count = 0;
    for (let y = 1; y < n - 1; y++)
      for (let x = 1; x < n - 1; x++) {
        const nx = x / (n - 1),
          ny = y / (n - 1);
        if (!inside(p.shape, nx, ny) || !contains(box, nx, ny)) continue;
        if (
          name === "outline" &&
          contains(
            {
              left: face.left + face.width * 0.15,
              top: face.top + face.height * 0.12,
              width: face.width * 0.7,
              height: face.height * 0.76,
            },
            nx,
            ny,
          )
        )
          continue;
        const i = y * n + x;
        for (let c = 0; c < 3; c++) {
          sum += (target[i * 3 + c] / 255 - raster[i * 3 + c]) ** 2;
          for (const delta of [1, n])
            edge +=
              ((target[(i + delta) * 3 + c] - target[(i - delta) * 3 + c]) /
                255 -
                (raster[(i + delta) * 3 + c] - raster[(i - delta) * 3 + c])) **
              2;
        }
        count++;
      }
    result[name] = {
      mse: count ? sum / (count * 3) : 0,
      edgeMse: count ? edge / (count * 6) : 0,
      pixels: count,
    };
  }
  return result;
}
