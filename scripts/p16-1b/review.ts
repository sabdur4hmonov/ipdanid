import type { RegionBox } from "../../src/core/types";
import {
  portraitViewingImage,
  viewingSsimPrepared,
} from "../../src/core/viewing-ssim";
import { viewingMask } from "../../src/core/viewing-mask";

export type FaceScore = {
  face: number;
  nose: number;
  eyes: number;
  mouth: number;
};
export function scoreRender(
  target: Uint8Array,
  rgb: Float32Array,
  faces: RegionBox[],
  shape: Parameters<typeof viewingMask>[0],
): FaceScore[] {
  const goal = portraitViewingImage(
    Float32Array.from({ length: 250000 }, (_, k) => target[k * 3] / 255),
    500,
    faces,
  );
  const actual = portraitViewingImage(
    Float32Array.from({ length: 1000000 }, (_, k) => rgb[k * 3]),
    1000,
    faces,
  );
  const regions = faces.flatMap((f) =>
    [
      [0.3, 0.35, 0.4, 0.4],
      [0.1, 0.18, 0.8, 0.24],
      [0.2, 0.7, 0.6, 0.23],
    ].map(([x, y, w, h]) => ({
      left: f.left + x * f.width,
      top: f.top + y * f.height,
      width: f.width * w,
      height: f.height * h,
    })),
  );
  const m = viewingSsimPrepared(actual, goal, {
    faces,
    regions,
    boardMask: viewingMask(shape, 160),
  });
  return faces.map((_, k) => ({
    face: m.faces[k].ssim,
    nose: m.regions![k * 3].ssim,
    eyes: m.regions![k * 3 + 1].ssim,
    mouth: m.regions![k * 3 + 2].ssim,
  }));
}
export function safety(
  rows: { baseline: FaceScore[]; candidate: FaceScore[]; ratio: number }[],
) {
  if (
    !rows.length ||
    rows.some(
      (r) =>
        !r.baseline.length ||
        r.baseline.length !== r.candidate.length ||
        !Number.isFinite(r.ratio) ||
        ![...r.baseline, ...r.candidate].every((f) =>
          Object.values(f).every(Number.isFinite),
        ),
    )
  )
    return {
      eligible: false,
      reasons: ["invalid-or-missing-measurement"],
      faceDelta: null,
    };
  const faceDelta =
    rows.reduce(
      (s, r) =>
        s +
        r.candidate.reduce((t, f, k) => t + f.face - r.baseline[k].face, 0) /
          r.baseline.length,
      0,
    ) / rows.length;
  const reasons: string[] = [];
  if (faceDelta < -0.01) reasons.push("average-face-loss-over-0.01");
  if (
    rows.some((r) =>
      r.candidate.some(
        (f, k) =>
          f.eyes < r.baseline[k].eyes - 0.02 ||
          f.mouth < r.baseline[k].mouth - 0.02,
      ),
    )
  )
    reasons.push("per-person-eyes-or-mouth-loss-over-0.02");
  if (rows.some((r) => r.ratio > 1.5))
    reasons.push("per-case-compute-over-1.5x");
  return { eligible: !reasons.length, reasons, faceDelta };
}
