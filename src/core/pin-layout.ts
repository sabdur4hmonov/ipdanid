import type { CircleLayout, MaterialProfile, Pin } from "./types";
import { assertPinSpacing } from "./geometry";

export function circleLayout(phaseDegreesClockwise: number): CircleLayout {
  const layout: CircleLayout = {
    version: "circle-phase/1",
    phaseDegreesClockwise,
    reference: "board-top/y-down/clockwise",
    radiusNormalized: 0.48,
    templateVersion: "radial-leaders/1",
  };
  validateLayout(layout);
  return layout;
}
export function validateLayout(l: CircleLayout) {
  if (
    !l ||
    l.version !== "circle-phase/1" ||
    l.reference !== "board-top/y-down/clockwise" ||
    l.radiusNormalized !== 0.48 ||
    l.templateVersion !== "radial-leaders/1" ||
    !Number.isFinite(l.phaseDegreesClockwise) ||
    l.phaseDegreesClockwise < 0 ||
    l.phaseDegreesClockwise >= 360
  )
    throw new Error("Invalid circle layout metadata");
}
export function phasePins(count: number, l: CircleLayout) {
  validateLayout(l);
  return Array.from({ length: count }, (_, id) => {
    const a =
      (id / count) * Math.PI * 2 + (l.phaseDegreesClockwise * Math.PI) / 180;
    return { id, x: 0.5 + 0.48 * Math.sin(a), y: 0.5 - 0.48 * Math.cos(a) };
  });
}
// Explicit new board, never mutation of an existing profile or photo rotation.
export function withCircleLayout(
  p: MaterialProfile,
  layout: CircleLayout,
  coordinates?: Pin[],
): MaterialProfile {
  if (p.shape !== "circle" || p.widthMm !== p.heightMm)
    throw new Error("Circle layout requires a circular board");
  const result = {
    ...structuredClone(p),
    id: `circle-phase1-${p.pins.length}-${layout.phaseDegreesClockwise}`,
    version: 5,
    pinLayout: structuredClone(layout),
    pins: coordinates
      ? structuredClone(coordinates)
      : phasePins(p.pins.length, layout),
  };
  if (result.pins.length !== p.pins.length)
    throw new Error("Wrong layout pin count");
  validateProfileLayout(result);
  assertPinSpacing(result);
  return result;
}
export function validateProfileLayout(p: MaterialProfile) {
  if (!p.pinLayout) return;
  validateLayout(p.pinLayout);
  if (p.shape !== "circle" || p.widthMm !== p.heightMm || p.version < 5)
    throw new Error("Invalid layout board");
  const expected = phasePins(p.pins.length, p.pinLayout);
  if (
    p.pins.some(
      (pin, id) =>
        pin.id !== id ||
        !Number.isFinite(pin.x) ||
        !Number.isFinite(pin.y) ||
        Math.abs(pin.x - expected[id].x) > 1e-12 ||
        Math.abs(pin.y - expected[id].y) > 1e-12,
    )
  )
    throw new Error("Pin coordinates disagree with layout metadata");
  assertPinSpacing(p);
}
// Labels alternate inward rings. 240 IDs remain separated with a leader to each nail.
export function templateLabel(p: MaterialProfile, id: number) {
  if (p.shape === "heart") {
    // The concave notch has no useful radial inward direction. Use the actual
    // clockwise perimeter tangent in physical millimeters, including aspect.
    const pin = p.pins[id],
      a = p.pins[(id + p.pins.length - 1) % p.pins.length],
      b = p.pins[(id + 1) % p.pins.length],
      dx = (b.x - a.x) * p.widthMm,
      dy = (b.y - a.y) * p.heightMm,
      length = Math.hypot(dx, dy),
      inset = id % 2 ? 14 : 8;
    return {
      x: pin.x * p.widthMm - (dy / length) * inset,
      y: pin.y * p.heightMm + (dx / length) * inset,
    };
  }
  const pin = p.pins[id],
    dx = pin.x - 0.5,
    dy = pin.y - 0.5;
  const radiusMm = Math.hypot(dx * p.widthMm, dy * p.heightMm);
  const ratio = (radiusMm - (id % 2 ? 16 : 8)) / radiusMm;
  return {
    x: (0.5 + dx * ratio) * p.widthMm,
    y: (0.5 + dy * ratio) * p.heightMm,
  };
}
