import { validSubjectPlan, type SubjectPlan } from "./subject-plan";
import { contains } from "./portrait";
import { inside } from "./geometry";
import {
  regionQuality,
  screenQuality,
  type RegionQuality,
} from "./quality-screen";
import type { MaterialProfile, PortraitSettings, RegionBox } from "./types";
export interface SubjectObjectiveSettings {
  version: "normalized-subject/1";
  normalization: "equal-subject-mass-max-overlap/1";
  detailMultiplier: number;
  sourceEdgeBoost: number;
}
export const DEFAULT_SUBJECT_OBJECTIVE: SubjectObjectiveSettings = {
  version: "normalized-subject/1",
  normalization: "equal-subject-mass-max-overlap/1",
  detailMultiplier: 2,
  sourceEdgeBoost: 1,
};
export function validSubjectObjective(s: SubjectObjectiveSettings) {
  if (
    !s ||
    s.version !== DEFAULT_SUBJECT_OBJECTIVE.version ||
    s.normalization !== DEFAULT_SUBJECT_OBJECTIVE.normalization ||
    ![s.detailMultiplier, s.sourceEdgeBoost].every(Number.isFinite) ||
    s.detailMultiplier < 1 ||
    s.detailMultiplier > 4 ||
    s.sourceEdgeBoost < 0 ||
    s.sourceEdgeBoost > 2
  )
    throw Error("Invalid subject objective");
}
export function subjectWeightField(
  plan: SubjectPlan,
  n: number,
  p: MaterialProfile,
  pixels: Uint8Array,
  s: SubjectObjectiveSettings,
  portrait?: PortraitSettings,
) {
  validSubjectPlan(plan, portrait);
  validSubjectObjective(s);
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 320 ||
    pixels.length !== n * n * 3 ||
    plan.subjects.length > 3 ||
    plan.subjects.some((v) => !v.reviewed)
  )
    throw Error("subject-fit/review");
  const board = Uint8Array.from(
      { length: n * n },
      (_, k) =>
        +inside(p.shape, (k % n) / (n - 1), Math.floor(k / n) / (n - 1)),
    ),
    area = board.reduce((a, b) => a + b, 0),
    weights = Float64Array.from(board),
    fields: Float64Array[] = [],
    masses: number[] = [];
  const tone = (k: number) =>
    (pixels[k * 3] + pixels[k * 3 + 1] + pixels[k * 3 + 2]) / 765;
  for (const subject of plan.subjects) {
    const field = new Float64Array(n * n);
    let sum = 0;
    for (let k = 0; k < n * n; k++) {
      const x = k % n,
        y = Math.floor(k / n),
        xx = x / (n - 1),
        yy = y / (n - 1);
      if (!board[k] || !contains(subject.bounds, xx, yy)) continue;
      const detail = subject.regions.some((v) => contains(v.box, xx, yy)),
        gradient = Math.hypot(
          x < n - 1 && board[k + 1] ? tone(k) - tone(k + 1) : 0,
          y < n - 1 && board[k + n] ? tone(k) - tone(k + n) : 0,
        );
      field[k] =
        (detail ? s.detailMultiplier : 1) *
        (1 + s.sourceEdgeBoost * Math.min(1, gradient * 8));
      sum += field[k];
    }
    if (sum < 4) throw Error("subject-fit/clipped");
    const mass = (area * 4) / plan.subjects.length;
    for (let k = 0; k < n * n; k++) field[k] *= mass / sum;
    fields.push(field);
    masses.push(field.reduce((a, b) => a + b, 0));
  }
  for (let k = 0; k < n * n; k++)
    for (const field of fields) weights[k] = Math.max(weights[k], field[k]);
  return { weights, board, normalizedMasses: masses, fields };
}
export function measureSubjects(
  plan: SubjectPlan,
  target: Float64Array,
  rendered: Float64Array,
  n: number,
  p: MaterialProfile,
) {
  const result: Record<string, RegionQuality> = {};
  for (const subject of plan.subjects)
    for (const [key, box] of [
      ["whole", subject.bounds],
      ...subject.regions.map((v, j) => [`${v.role}-${j + 1}`, v.box]),
    ] as [string, RegionBox][]) {
      const mask = Uint8Array.from(
        { length: n * n },
        (_, k) =>
          +(
            inside(p.shape, (k % n) / (n - 1), Math.floor(k / n) / (n - 1)) &&
            contains(box, (k % n) / (n - 1), Math.floor(k / n) / (n - 1))
          ),
      );
      result[`${subject.id}.${key}`] = regionQuality(
        target,
        rendered,
        mask,
        n,
        p,
      );
    }
  return result;
}
export function screenSubjects(
  reference: Record<string, RegionQuality>,
  candidate: Record<string, RegionQuality>,
) {
  const screen = screenQuality(reference, candidate),
    subjects = [...new Set(Object.keys(reference).map((k) => k.split(".")[0]))];
  return {
    ...screen,
    subjects: subjects.map((id) => ({
      id,
      metricsPass: !screen.failures.some((f) => f.region.startsWith(`${id}.`)),
    })),
    worstSubjectPass: screen.metricsPass,
  };
}
