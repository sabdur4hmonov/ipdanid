import type { PortraitSettings, RegionBox, MaterialProfile } from "./types";
import { inside } from "./geometry";
export const DEFAULT_PORTRAIT: PortraitSettings = {
  enabled: false,
  face: { left: 0.27, top: 0.32, width: 0.5, height: 0.6 },
  background: 0.75,
  localContrast: 0.35,
};
export function portraitRegions(face: RegionBox): Record<string, RegionBox> {
  const part = (left: number, top: number, width: number, height: number) => ({
    left: face.left + left * face.width,
    top: face.top + top * face.height,
    width: width * face.width,
    height: height * face.height,
  });
  return {
    face,
    eyes: part(0.08, 0.23, 0.84, 0.18),
    nose: part(0.27, 0.4, 0.46, 0.28),
    mouth: part(0.18, 0.67, 0.64, 0.18),
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
  face: RegionBox,
) {
  const result: Record<
    string,
    { mse: number; edgeMse: number; pixels: number }
  > = {};
  for (const [name, box] of Object.entries(portraitRegions(face))) {
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
