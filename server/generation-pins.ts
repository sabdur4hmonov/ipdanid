import type { MaterialProfile } from "../src/core/types";
import { DomainError } from "./store";
// Different JS runtimes may spell sin/cos results one floating-point step
// differently. The old guide/hash binds those reviewed numbers verbatim.
// Only sub-picometre rounding of the SAME authoritative kit holes is allowed.
export function reviewedKitPins(
  profile: MaterialProfile,
  value: unknown,
): MaterialProfile {
  if (value === undefined) return profile;
  const s = value as { version: unknown; coordinates: unknown };
  if (
    !s ||
    Object.keys(s).sort().join() !== "coordinates,version" ||
    s.version !== "kit-pin-snapshot/1" ||
    !Array.isArray(s.coordinates) ||
    s.coordinates.length !== profile.pins.length
  )
    throw new DomainError("Invalid kit coordinate snapshot");
  const coordinates = s.coordinates;
  for (let k = 0; k < coordinates.length; k++) {
    const p = coordinates[k];
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      p.some((x) => typeof x !== "number" || !Number.isFinite(x)) ||
      Math.abs(p[0] - profile.pins[k].x) > 8 * Number.EPSILON ||
      Math.abs(p[1] - profile.pins[k].y) > 8 * Number.EPSILON
    )
      throw new DomainError(
        "Kit coordinate snapshot differs from the standard kit",
      );
  }
  return {
    ...profile,
    pins: profile.pins.map((p, k) => ({
      ...p,
      x: coordinates[k][0],
      y: coordinates[k][1],
    })),
  };
}
