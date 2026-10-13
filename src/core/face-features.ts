import type { RegionBox, EditParams, PortraitSettings, Shape } from "./types";
import { sourceToTarget } from "./coordinates";
import { inside } from "./geometry";
export type Landmark = { x: number; y: number };
export type SourceFace = {
  face: RegionBox;
  eyes: RegionBox;
  nose: RegionBox;
  mouth: RegionBox;
};
const EYES = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388,
  466,
];
const NOSE = [
  1, 2, 4, 5, 6, 19, 94, 97, 98, 129, 168, 195, 197, 294, 326, 327, 358,
];
const MOUTH = [
  0, 11, 12, 13, 14, 17, 37, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178,
  181, 191, 267, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402,
  405, 415,
];
const OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];
function bounds(
  points: Landmark[],
  indices: number[],
  padding = 0.012,
): RegionBox {
  const selected = indices.map((i) => points[i]);
  if (
    selected.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    throw Error("Invalid face landmarks");
  const l = Math.max(0, Math.min(...selected.map((p) => p.x)) - padding),
    t = Math.max(0, Math.min(...selected.map((p) => p.y)) - padding);
  const r = Math.min(1, Math.max(...selected.map((p) => p.x)) + padding),
    b = Math.min(1, Math.max(...selected.map((p) => p.y)) + padding);
  if (r <= l || b <= t) throw Error("Invalid face bounds");
  return { left: l, top: t, width: r - l, height: b - t };
}
export function faceFeatures(points: Landmark[]): SourceFace {
  if (points.length < 468) throw Error("Incomplete face landmarks");
  return {
    face: bounds(points, OVAL, 0.02),
    eyes: bounds(points, EYES),
    nose: bounds(points, NOSE),
    mouth: bounds(points, MOUTH),
  };
}
export function reviewedFacePortrait(
  face: SourceFace,
  previous: PortraitSettings,
  edits: EditParams,
  width: number,
  height: number,
  aspect: number,
  n: number,
  shape: Shape = "rectangle",
): PortraitSettings {
  function map(b: RegionBox, min: number): RegionBox {
    const p = [
      [b.left, b.top],
      [b.left + b.width, b.top],
      [b.left, b.top + b.height],
      [b.left + b.width, b.top + b.height],
    ].map(([x, y]) =>
      sourceToTarget(x * width, y * height, width, height, edits, aspect, n),
    );
    const l = Math.min(...p.map((v) => v.x)),
      t = Math.min(...p.map((v) => v.y)),
      r = Math.max(...p.map((v) => v.x)),
      bottom = Math.max(...p.map((v) => v.y));
    if (
      l < 0 ||
      t < 0 ||
      r > 1 ||
      bottom > 1 ||
      r - l < min ||
      bottom - t < min
    )
      throw Error("Fit the complete face before applying regions");
    return { left: l, top: t, width: r - l, height: bottom - t };
  }
  const regions = {
    reference: "processed-target/sample-centers-v1" as const,
    placement: "manual" as const,
    eyes: map(face.eyes, 0.01),
    nose: map(face.nose, 0.01),
    mouth: map(face.mouth, 0.01),
  };
  for (const key of ["eyes", "nose", "mouth"] as const) {
    const b = regions[key];
    for (let y = 0; y <= 16; y++)
      for (let x = 0; x <= 16; x++)
        if (
          !inside(
            shape,
            b.left + (b.width * x) / 16,
            b.top + (b.height * y) / 16,
          )
        )
          throw Error(
            "Fit the complete facial features inside the board shape",
          );
  }
  return {
    ...previous,
    enabled: true,
    people: undefined,
    face: map(face.face, 0.1),
    regions,
    backgroundMask: undefined,
    foregroundMask: undefined,
  };
}
export function reviewedPeoplePortrait(
  faces: SourceFace[],
  previous: PortraitSettings,
  edits: EditParams,
  width: number,
  height: number,
  aspect: number,
  n: number,
  shape: Shape,
): PortraitSettings {
  if (faces.length < 2 || faces.length > 8)
    throw Error("Review at least two faces");
  const mapped = faces.map((f) =>
    reviewedFacePortrait(f, previous, edits, width, height, aspect, n, shape),
  );
  return {
    ...mapped[0],
    enabled: true,
    background: 0,
    localContrast: 0,
    people: {
      version: "multiple-portraits/1",
      reference: "processed-target/sample-centers-v1",
      faces: mapped.map((p) => ({ id:crypto.randomUUID(), face: p.face, regions: p.regions! })),
    },
  };
}

export function estimatedPairPortrait(
  previous: PortraitSettings,
): PortraitSettings {
  const faces = [0.12, 0.56].map((left) => {
    const face = { left, top: 0.23, width: 0.3, height: 0.55 };
    const part = (l: number, t: number, w: number, h: number) => ({
      left: left + l * face.width,
      top: face.top + t * face.height,
      width: w * face.width,
      height: h * face.height,
    });
    return {
      id:crypto.randomUUID(),
      face,
      regions: {
        reference: "processed-target/sample-centers-v1" as const,
        placement: "proportional-estimate" as const,
        eyes: part(0.08, 0.23, 0.84, 0.18),
        nose: part(0.27, 0.4, 0.46, 0.28),
        mouth: part(0.18, 0.67, 0.64, 0.18),
      },
    };
  });
  return {
    ...previous,
    enabled: true,
    background: 0,
    localContrast: 0,
    face: faces[0].face,
    regions: faces[0].regions,
    people: {
      version: "multiple-portraits/1",
      reference: "processed-target/sample-centers-v1",
      faces,
    },
  };
}
