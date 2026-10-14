import type { EditParams, Shape } from "./types";
import type { SubjectKind, SubjectPlan } from "./subject-plan";
export function subjectRecipeKey(
  source: string,
  kind: SubjectKind,
  edits: EditParams,
  aspect: number,
  n: number,
  shape: Shape,
  targetHash = "",
) {
  return JSON.stringify([
    source,
    kind,
    edits.zoom,
    edits.panX,
    edits.panY,
    edits.rotation,
    edits.brightness,
    edits.contrast,
    aspect,
    n,
    shape,
    targetHash,
  ]);
}
export function defaultSubjectMarks(): SubjectPlan["subjects"] {
  return [
    {
      id: "subject-1",
      bounds: { left: 0, top: 0, width: 1, height: 1 },
      reviewed: false,
      regions: [],
    },
  ];
}
