import type { MaterialProfile } from "./types";
import { assertPinSpacing } from "./geometry";
import { circleLayout, phasePins, validateProfileLayout } from "./pin-layout";

export interface PinBasis {
  version: "circle-chords/1";
  count: 240 | 320;
  minimumAngularGapDegrees: number;
  experimental: true;
}
export function validatePinBasis(p: MaterialProfile) {
  const b = p.pinBasis;
  if (
    !b ||
    b.version !== "circle-chords/1" ||
    ![240, 320].includes(b.count) ||
    b.experimental !== true ||
    p.shape !== "circle" ||
    p.widthMm !== p.heightMm ||
    p.pins.length !== b.count ||
    p.colors.length !== 1 ||
    !Number.isFinite(b.minimumAngularGapDegrees) ||
    b.minimumAngularGapDegrees < 1 ||
    b.minimumAngularGapDegrees > 90 ||
    p.minPinGap !==
      Math.ceil((b.minimumAngularGapDegrees * b.count) / 360 - 1e-10) ||
    p.pinLayout?.phaseDegreesClockwise !== 0
  )
    throw Error("Invalid experimental circular pin basis");
  validateProfileLayout(p);
  assertPinSpacing(p);
}
export function withPinBasis(
  source: MaterialProfile,
  count: 240 | 320,
  minimumAngle?: number,
): MaterialProfile {
  const angle =
    minimumAngle ??
    source.pinBasis?.minimumAngularGapDegrees ??
    (source.minPinGap * 360) / source.pins.length;
  const layout = circleLayout(0);
  const result: MaterialProfile = {
    ...structuredClone(source),
    id: `circle-chords1-${count}`,
    version: 6,
    provisional: true,
    pinLayout: layout,
    pins: phasePins(count, layout),
    minPinGap: Math.ceil((angle * count) / 360 - 1e-10),
    pinBasis: {
      version: "circle-chords/1",
      count,
      minimumAngularGapDegrees: angle,
      experimental: true,
    },
  };
  validatePinBasis(result);
  return result;
}
