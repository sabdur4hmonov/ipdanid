// Source-image coordinates, independent of crop, target resolution and portrait priority.
export type PersonMask = {
  width: number;
  height: number;
  values: Float32Array;
};
export function validatePersonMask(mask: PersonMask) {
  if (
    !Number.isInteger(mask.width) ||
    !Number.isInteger(mask.height) ||
    mask.width < 1 ||
    mask.height < 1 ||
    mask.width * mask.height > 1024 * 1024 ||
    mask.values.length !== mask.width * mask.height ||
    mask.values.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw Error("Invalid person mask");
}
export function foregroundAlpha(confidence: number) {
  const t = Math.max(0, Math.min(1, (confidence - 0.25) / 0.5));
  return t * t * (3 - 2 * t);
}
export function paintPersonMask(
  mask: PersonMask,
  x: number,
  y: number,
  radius: number,
  keep: boolean,
): PersonMask {
  validatePersonMask(mask);
  if (
    ![x, y, radius].every(Number.isFinite) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1 ||
    radius < 0.005 ||
    radius > 0.25
  )
    throw Error("Invalid person brush");
  const values = mask.values.slice();
  // Radius is a fraction of the shorter source side, preserving a circular brush.
  const r = radius * Math.min(mask.width, mask.height);
  for (
    let py = Math.max(0, Math.floor(y * mask.height - r));
    py < Math.min(mask.height, Math.ceil(y * mask.height + r));
    py++
  )
    for (
      let px = Math.max(0, Math.floor(x * mask.width - r));
      px < Math.min(mask.width, Math.ceil(x * mask.width + r));
      px++
    )
      if (
        Math.hypot(px + 0.5 - x * mask.width, py + 0.5 - y * mask.height) <= r
      )
        values[py * mask.width + px] = keep ? 1 : 0;
  return { ...mask, values };
}
export function whitePixel(rgb: readonly number[], confidence: number) {
  const a = foregroundAlpha(confidence);
  return rgb.map((v) => Math.round(v * a + 255 * (1 - a)));
}
