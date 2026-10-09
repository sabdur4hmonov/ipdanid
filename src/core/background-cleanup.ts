import {
  foregroundAlpha,
  validatePersonMask,
  type PersonMask,
} from "./person-mask";
// Only revise uncertain source pixels. Fully opaque primary foreground is immutable.
// No component/face-count filtering: separate people, clothing and hair survive.
export function cleanUncertainBackground(
  primary: PersonMask,
  semantic: PersonMask,
): PersonMask {
  validatePersonMask(primary);
  validatePersonMask(semantic);
  const values = primary.values.slice();
  for (let y = 0; y < primary.height; y++)
    for (let x = 0; x < primary.width; x++) {
      const index = y * primary.width + x,
        m = values[index];
      if (m >= 0.75) continue;
      const sx = Math.max(
          0,
          Math.min(
            semantic.width - 1,
            ((x + 0.5) * semantic.width) / primary.width - 0.5,
          ),
        ),
        sy = Math.max(
          0,
          Math.min(
            semantic.height - 1,
            ((y + 0.5) * semantic.height) / primary.height - 0.5,
          ),
        );
      const l = Math.floor(sx),
        t = Math.floor(sy),
        r = Math.min(semantic.width - 1, l + 1),
        b = Math.min(semantic.height - 1, t + 1),
        dx = sx - l,
        dy = sy - t;
      const s =
        semantic.values[t * semantic.width + l] * (1 - dx) * (1 - dy) +
        semantic.values[t * semantic.width + r] * dx * (1 - dy) +
        semantic.values[b * semantic.width + l] * (1 - dx) * dy +
        semantic.values[b * semantic.width + r] * dx * dy;
      const confidence = Math.max(0, Math.min(1, (m - 0.5) / 0.25)),
        retain = confidence * confidence * (3 - 2 * confidence);
      values[index] = m * Math.max(foregroundAlpha(s), retain);
    }
  return { ...primary, values };
}
