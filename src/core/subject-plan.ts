import type { EditParams, PortraitSettings, RegionBox } from "./types";
import { portraitPeople, portraitRegions, validPortrait } from "./portrait";
export type SubjectKind =
  "people" | "animal" | "vehicle" | "object" | "whole-image";
export const SUBJECT_KINDS: SubjectKind[] = [
  "people",
  "animal",
  "vehicle",
  "object",
  "whole-image",
];
export interface SubjectPlan {
  version: "subject-plan/1";
  reference: "processed-target/sample-centers-v1";
  kind: SubjectKind;
  preparation: "original" | "explicit-person-mask" | "manual-subject-mask";
  sourceRevision: string;
  transform: EditParams;
  subjects: {
    id: string;
    bounds: RegionBox;
    reviewed: boolean;
    regions: { role: "eyes" | "nose" | "mouth" | "detail"; box: RegionBox }[];
  }[];
}
export function makeSubjectPlan(
  kind: SubjectKind,
  sourceRevision: string,
  transform: EditParams,
  portrait?: PortraitSettings,
  preparation: SubjectPlan["preparation"] = "original",
): SubjectPlan {
  const subjects =
    kind === "people" && portrait?.enabled
      ? portraitPeople(portrait).map((person, index) => {
          const boxes = portraitRegions(person);
          return {
            id:
              portrait.people?.faces[index].id ??
              portrait.personId ??
              `person-${index + 1}`,
            bounds: { ...person.face },
            reviewed: person.regions?.placement === "manual",
            regions: (["eyes", "nose", "mouth"] as const).map((role) => ({
              role,
              box: { ...boxes[role] },
            })),
          };
        })
      : [
          {
            id: "subject-1",
            bounds: { left: 0, top: 0, width: 1, height: 1 },
            reviewed: false,
            regions: [],
          },
        ];
  const plan: SubjectPlan = {
    version: "subject-plan/1",
    reference: "processed-target/sample-centers-v1",
    kind,
    preparation,
    sourceRevision,
    transform: { ...transform },
    subjects,
  };
  validSubjectPlan(plan, portrait);
  return plan;
}
export function validSubjectPlan(s: SubjectPlan, portrait?: PortraitSettings) {
  const box = (b: RegionBox) =>
    b &&
    [b.left, b.top, b.width, b.height].every(Number.isFinite) &&
    b.left >= 0 &&
    b.top >= 0 &&
    b.width > 0 &&
    b.height > 0 &&
    b.left + b.width <= 1.00001 &&
    b.top + b.height <= 1.00001;
  if (
    !s ||
    s.version !== "subject-plan/1" ||
    s.reference !== "processed-target/sample-centers-v1" ||
    !SUBJECT_KINDS.includes(s.kind) ||
    !["original", "explicit-person-mask", "manual-subject-mask"].includes(
      s.preparation,
    ) ||
    typeof s.sourceRevision !== "string" ||
    !s.sourceRevision.length ||
    s.sourceRevision.length > 128 ||
    !s.transform ||
    !["zoom", "panX", "panY", "rotation", "brightness", "contrast"].every((k) =>
      Number.isFinite(s.transform[k as keyof EditParams]),
    ) ||
    !Array.isArray(s.subjects) ||
    s.subjects.length < 1 ||
    s.subjects.length > 8 ||
    new Set(s.subjects.map((x) => x.id)).size !== s.subjects.length
  )
    throw Error("Invalid subject plan");
  if (s.kind !== "people" && s.preparation === "explicit-person-mask")
    throw Error("Person-only mask cannot prepare this subject");
  for (const subject of s.subjects)
    if (
      !subject ||
      typeof subject.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(subject.id) ||
      !box(subject.bounds) ||
      typeof subject.reviewed !== "boolean" ||
      !Array.isArray(subject.regions) ||
      subject.regions.length > 32 ||
      subject.regions.some(
        (r) =>
          !r ||
          !["eyes", "nose", "mouth", "detail"].includes(r.role) ||
          !box(r.box),
      )
    )
      throw Error("Invalid subject regions");
  if (s.kind === "people") {
    if (!portrait?.enabled)
      throw Error("People plan requires matching portrait regions");
    validPortrait(portrait);
    const people = portraitPeople(portrait);
    if (people.length !== s.subjects.length)
      throw Error("Subject count differs from portrait");
    for (let k = 0; k < people.length; k++) {
      const r = portraitRegions(people[k]),
        subject = s.subjects[k];
      if (
        JSON.stringify(subject.bounds) !== JSON.stringify(people[k].face) ||
        subject.reviewed !== (people[k].regions?.placement === "manual") ||
        subject.regions.length !== 3 ||
        subject.regions.some(
          (v, j) =>
            v.role !== ["eyes", "nose", "mouth"][j] ||
            JSON.stringify(v.box) !== JSON.stringify(r[v.role]),
        )
      )
        throw Error("Subject regions differ from portrait");
    }
  } else if (portrait?.enabled)
    throw Error("General subjects cannot use human anatomy weights");
}
