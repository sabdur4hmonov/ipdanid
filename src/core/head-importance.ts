import { validOutline, type OutlinePoint } from "./head-outline";
import { sourceToTarget } from "./coordinates";
import type { MaterialProfile, EditParams } from "./types";

// Manual selection changes loss weights only, never photograph pixels.
export interface HeadImportance {
  version: "manual-head-importance/1";
  reference: "processed-target/sample-centers-v1";
  points: OutlinePoint[];
  weight: number;
  featherMm: number;
}
export function validHeadImportance(value: HeadImportance) {
  if (
    !value ||
    value.version !== "manual-head-importance/1" ||
    value.reference !== "processed-target/sample-centers-v1" ||
    !Number.isFinite(value.weight) ||
    value.weight < 1 ||
    value.weight > 8 ||
    !Number.isFinite(value.featherMm) ||
    value.featherMm < 1 ||
    value.featherMm > 20
  )
    throw Error("Invalid manual head importance");
  validOutline(value.points);
}
export function mappedHeadImportance(
  points: OutlinePoint[],
  edits: EditParams,
  width: number,
  height: number,
  aspect: number,
  n: number,
): HeadImportance {
  validOutline(points);
  if (![width, height, aspect, n].every((v) => Number.isFinite(v) && v > 0))
    throw Error("Invalid head selection coordinates");
  const selection: HeadImportance = {
    version: "manual-head-importance/1",
    reference: "processed-target/sample-centers-v1",
    points: points.map((p) =>
      sourceToTarget(
        p.x * width,
        p.y * height,
        width,
        height,
        edits,
        aspect,
        n,
      ),
    ),
    weight: 8,
    featherMm: 4,
  };
  // A cropped-away head requires correction, never silent clamping to another selection.
  validHeadImportance(selection);
  return selection;
}
export function headImportance(
  base: (x: number, y: number) => number,
  selection: HeadImportance,
  profile: Pick<MaterialProfile, "widthMm" | "heightMm">,
) {
  validHeadImportance(selection);
  if (
    ![profile.widthMm, profile.heightMm].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw Error("Invalid head importance geometry");
  return (x: number, y: number) => {
    let inside = false,
      distance = Infinity;
    const px = x * profile.widthMm,
      py = y * profile.heightMm;
    for (let k = 0; k < selection.points.length; k++) {
      const a = selection.points[k],
        b = selection.points[(k + 1) % selection.points.length];
      if (
        a.y > y !== b.y > y &&
        x < a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y)
      )
        inside = !inside;
      const ax = a.x * profile.widthMm,
        ay = a.y * profile.heightMm,
        dx = (b.x - a.x) * profile.widthMm,
        dy = (b.y - a.y) * profile.heightMm,
        t = Math.max(
          0,
          Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
        );
      distance = Math.min(
        distance,
        Math.hypot(px - ax - t * dx, py - ay - t * dy),
      );
    }
    const t = inside ? Math.min(1, distance / selection.featherMm) : 0;
    return Math.max(
      base(x, y),
      1 + (selection.weight - 1) * t * t * (3 - 2 * t),
    );
  };
}
