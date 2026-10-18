export const ANIMATION_MAX_FRAMES = 61;
// Explicit physical area averaging avoids GPU/CPU canvas filter differences.
export function animationThumbnail(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 1000 ||
    height > 1000 ||
    rgba.length !== width * height * 4
  )
    throw Error("animation/raster-bounds");
  const scale = Math.min(320 / width, 320 / height, 1),
    w = Math.max(1, Math.round(width * scale)),
    h = Math.max(1, Math.round(height * scale)),
    out = new Uint8ClampedArray(w * h * 4),
    sx = width / w,
    sy = height / h;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sums = [0, 0, 0],
        left = x * sx,
        right = (x + 1) * sx,
        top = y * sy,
        bottom = (y + 1) * sy;
      for (let yy = Math.floor(top); yy < Math.ceil(bottom); yy++)
        for (let xx = Math.floor(left); xx < Math.ceil(right); xx++) {
          const weight =
              (Math.min(right, xx + 1) - Math.max(left, xx)) *
              (Math.min(bottom, yy + 1) - Math.max(top, yy)),
            at =
              (Math.min(yy, height - 1) * width + Math.min(xx, width - 1)) * 4;
          for (let c = 0; c < 3; c++) sums[c] += rgba[at + c] * weight;
        }
      for (let c = 0; c < 3; c++)
        out[(y * w + x) * 4 + c] = Math.round(sums[c] / (sx * sy));
      out[(y * w + x) * 4 + 3] = 255;
    }
  return { width: w, height: h, rgba: out };
}
export function animationSteps(lines: number) {
  if (!Number.isSafeInteger(lines) || lines < 1 || lines > 20000)
    throw Error("animation/bounds");
  const frames = Math.min(ANIMATION_MAX_FRAMES, lines + 1);
  return Array.from({ length: frames }, (_, i) =>
    Math.round((lines * i) / (frames - 1)),
  );
}
// Original bounded GIF89a encoder. Clear every200 literals so the LZW table
// never reaches512 entries: every code is exactly9bits. Deliberately modest
// compression, no dependency or claimed lossless full-color video.
export class SequenceGif {
  private parts: Uint8Array[] = [];
  private count = 0;
  constructor(
    private width: number,
    private height: number,
    private gray: boolean,
  ) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 320 ||
      height > 320
    )
      throw Error("animation/gif-bounds");
    const palette = Array.from({ length: 256 }, (_, i) =>
      gray
        ? [i, i, i]
        : [
            Math.round(((i >> 5) * 255) / 7),
            Math.round((((i >> 2) & 7) * 255) / 7),
            (i & 3) * 85,
          ],
    ).flat();
    this.parts.push(
      Uint8Array.from([
        ...new TextEncoder().encode("GIF89a"),
        width & 255,
        width >> 8,
        height & 255,
        height >> 8,
        247,
        0,
        0,
        ...palette,
        33,
        255,
        11,
        ...new TextEncoder().encode("NETSCAPE2.0"),
        3,
        1,
        0,
        0,
        0,
      ]),
    );
  }
  add(rgba: Uint8ClampedArray, delayCs: number) {
    if (
      ++this.count > ANIMATION_MAX_FRAMES ||
      rgba.length !== this.width * this.height * 4 ||
      !Number.isInteger(delayCs) ||
      delayCs < 1 ||
      delayCs > 1000
    )
      throw Error("animation/gif-bounds");
    const codes: number[] = [];
    let current = 0,
      bits = 0;
    const emit = (code: number) => {
      current |= code << bits;
      bits += 9;
      while (bits >= 8) {
        codes.push(current & 255);
        current >>= 8;
        bits -= 8;
      }
    };
    emit(256);
    for (let p = 0; p < rgba.length; p += 4) {
      if (p && (p / 4) % 200 === 0) emit(256);
      emit(
        this.gray
          ? rgba[p]
          : ((rgba[p] >> 5) << 5) |
              ((rgba[p + 1] >> 5) << 2) |
              (rgba[p + 2] >> 6),
      );
    }
    emit(257);
    if (bits) codes.push(current & 255);
    const data: number[] = [
      33,
      249,
      4,
      4,
      delayCs & 255,
      delayCs >> 8,
      0,
      0,
      44,
      0,
      0,
      0,
      0,
      this.width & 255,
      this.width >> 8,
      this.height & 255,
      this.height >> 8,
      0,
      8,
    ];
    for (let p = 0; p < codes.length; p += 255) {
      const block = codes.slice(p, p + 255);
      data.push(block.length, ...block);
    }
    data.push(0);
    this.parts.push(Uint8Array.from(data));
  }
  finish() {
    if (!this.count) throw Error("animation/empty");
    return new Blob(
      [...this.parts.map((p) => Uint8Array.from(p)), Uint8Array.of(59)],
      { type: "image/gif" },
    );
  }
}
