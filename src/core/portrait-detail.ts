// Pixel-derived tone/contour preparation, not face synthesis or a result overlay.
// Dark hair/clothes remain tonal; bright flat areas carry less thread density.
export function contourPortrait(
  input: Uint8Array,
  n: number,
  preserveTone = false,
): Uint8Array {
  if (!Number.isInteger(n) || n < 8 || n > 512 || input.length !== n * n * 3)
    throw Error("Invalid portrait detail dimensions");
  const gray = Float64Array.from(
      { length: n * n },
      (_, i) => input[i * 3] / 255,
    ),
    temp = new Float64Array(n * n),
    local = new Float64Array(n * n),
    radius = Math.max(2, Math.round(n * 0.04));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let sum = 0,
        count = 0;
      for (
        let j = Math.max(0, x - radius);
        j <= Math.min(n - 1, x + radius);
        j++
      ) {
        sum += gray[y * n + j];
        count++;
      }
      temp[y * n + x] = sum / count;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let sum = 0,
        count = 0;
      for (
        let j = Math.max(0, y - radius);
        j <= Math.min(n - 1, y + radius);
        j++
      ) {
        sum += temp[j * n + x];
        count++;
      }
      local[y * n + x] = sum / count;
    }
  const output = new Uint8Array(input.length);
  for (let i = 0; i < gray.length; i++) {
    if (preserveTone) {
      const amount = 0.65 * Math.max(0, Math.min(1, (local[i] - 0.35) / 0.25));
      const change =
        amount * Math.max(-0.12, Math.min(0.12, 1.25 * (gray[i] - local[i])));
      const value = Math.round(
        255 * Math.max(0, Math.min(1, gray[i] + change)),
      );
      output.fill(value, i * 3, i * 3 + 3);
      continue;
    }
    const amount = 0.65 * Math.max(0, Math.min(1, (gray[i] - 0.35) / 0.25)),
      detail = Math.max(0, Math.min(1, 4 * (local[i] - gray[i]))),
      value = Math.round(
        255 * (1 - ((1 - gray[i]) * (1 - amount) + detail * amount)),
      );
    output.fill(value, i * 3, i * 3 + 3);
  }
  return output;
}
