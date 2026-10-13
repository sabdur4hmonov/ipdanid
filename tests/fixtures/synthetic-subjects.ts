// Procedural, license-free subject fixtures. They verify mechanics only
// (pixel preservation, advice, gating); they are not likeness references.
export type SyntheticSubject = "car" | "dog" | "object" | "stripes" | "flat";
export function syntheticSubject(kind: SyntheticSubject, n = 160) {
  const p = new Uint8Array(n * n * 3);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = x / n,
        w = y / n;
      let r = 235,
        g = 235,
        b = 235;
      if (kind === "car") {
        if (w > 0.45 && w < 0.65 && u > 0.15 && u < 0.85)
          [r, g, b] = [170, 30, 40];
        if (w > 0.35 && w < 0.46 && u > 0.3 && u < 0.7)
          [r, g, b] = [90, 120, 150];
        if (
          (u - 0.3) ** 2 + (w - 0.66) ** 2 < 0.004 ||
          (u - 0.7) ** 2 + (w - 0.66) ** 2 < 0.004
        )
          [r, g, b] = [20, 20, 20];
      } else if (kind === "dog") {
        if ((u - 0.5) ** 2 / 0.06 + (w - 0.55) ** 2 / 0.08 < 1) {
          const fur = 150 + 40 * Math.sin(u * 60) * Math.sin(w * 50);
          [r, g, b] = [fur, fur * 0.8, fur * 0.55];
        }
        if (
          (u - 0.42) ** 2 + (w - 0.45) ** 2 < 0.0008 ||
          (u - 0.58) ** 2 + (w - 0.45) ** 2 < 0.0008
        )
          [r, g, b] = [15, 12, 10];
      } else if (kind === "object") {
        if (u > 0.3 && u < 0.7 && w > 0.25 && w < 0.8)
          [r, g, b] = u > 0.45 && u < 0.55 ? [40, 90, 60] : [120, 170, 140];
      } else if (kind === "stripes") {
        const v = 128 + 100 * Math.sign(Math.sin(u * 40));
        [r, g, b] = [v, v, v];
      } else {
        const v = 120 + 10 * Math.sin(u * 3);
        [r, g, b] = [v, v, v];
      }
      const i = (y * n + x) * 3;
      p[i] = Math.round(r);
      p[i + 1] = Math.round(g);
      p[i + 2] = Math.round(b);
    }
  return p;
}
export function boxBlur(p: Uint8Array, n: number, radius: number, passes = 3) {
  let a = p;
  for (let k = 0; k < passes; k++) {
    const out = new Uint8Array(a.length);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        for (let c = 0; c < 3; c++) {
          let s = 0,
            m = 0;
          for (let dy = -radius; dy <= radius; dy++)
            for (let dx = -radius; dx <= radius; dx++) {
              const xx = x + dx,
                yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
              s += a[(yy * n + xx) * 3 + c];
              m++;
            }
          out[(y * n + x) * 3 + c] = Math.round(s / m);
        }
    a = out;
  }
  return a;
}
/** Encodes RGB pixels as an uncompressed 24-bit BMP for browser uploads. */
export function bmp(pixels: Uint8Array, n: number) {
  const row = Math.ceil((n * 3) / 4) * 4,
    size = 54 + row * n,
    out = new Uint8Array(size),
    v = new DataView(out.buffer);
  out[0] = 0x42;
  out[1] = 0x4d;
  v.setUint32(2, size, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, n, true);
  v.setInt32(22, -n, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, row * n, true);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 3,
        o = 54 + y * row + x * 3;
      out[o] = pixels[i + 2];
      out[o + 1] = pixels[i + 1];
      out[o + 2] = pixels[i];
    }
  return out;
}
