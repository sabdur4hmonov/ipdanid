// Fixed source-derived tone candidate. Never apply without the physical non-regression gate.
// No semantic features or generated pixels. Keep arithmetic identical to the sealed research recipe.
function blur(source: Float32Array, n: number, sigma: number) {
  const radius = Math.ceil(3 * sigma),
    weights = Float64Array.from({ length: 2 * radius + 1 }, (_, i) =>
      Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)),
    ),
    total = weights.reduce((a, b) => a + b, 0),
    row = new Float32Array(n * n),
    out = new Float32Array(n * n);
  for (let i = 0; i < weights.length; i++) weights[i] /= total;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++)
        sum +=
          source[y * n + Math.max(0, Math.min(n - 1, x + k))] *
          weights[k + radius];
      row[y * n + x] = sum;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++)
        sum +=
          row[Math.max(0, Math.min(n - 1, y + k)) * n + x] *
          weights[k + radius];
      out[y * n + x] = sum;
    }
  return out;
}
export function sourceMidcontrast(pixels: Uint8Array, n: number) {
  if (n < 32 || n > 500 || pixels.length !== n * n * 3)
    throw Error("midcontrast/input");
  const source = Float32Array.from(
      { length: n * n },
      (_, k) => pixels[k * 3] / 255,
    ),
    small = blur(source, n, 2),
    large = blur(source, n, 8);
  return Uint8Array.from({ length: pixels.length }, (_, k) => {
    const p = Math.floor(k / 3),
      v = source[p];
    return Math.round(
      255 *
        (v >= 0.98
          ? v
          : Math.max(0, v - 0.8 * Math.max(0, large[p] - small[p]))),
    );
  });
}
