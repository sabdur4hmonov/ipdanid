import { validatePersonMask, type PersonMask } from "./person-mask";
export type PhotoSubject = "people" | "animal" | "vehicle" | "object";
export type CutoutChoice = PhotoSubject | "auto";
const groups: Record<PhotoSubject, number[]> = {
  people: [15],
  animal: [3, 8, 10, 12, 13, 17],
  vehicle: [1, 2, 4, 6, 7, 14, 19],
  object: [5, 9, 11, 16, 18, 20],
};

// Select semantic foreground, never a person-only mask for an animal/object.
// Auto retains all recognised foreground components (including multiple subjects).
export function semanticCutout(
  labels: string[],
  masks: PersonMask[],
  choice: CutoutChoice,
) {
  if (
    labels.length !== 21 ||
    masks.length !== 21 ||
    labels[15] !== "person" ||
    labels[8] !== "cat" ||
    labels[12] !== "dog" ||
    !["auto", ...Object.keys(groups)].includes(choice)
  )
    throw Error("cutout/model-labels");
  const { width, height } = masks[0];
  for (const m of masks) {
    validatePersonMask(m);
    if (m.width !== width || m.height !== height)
      throw Error("cutout/mask-size");
  }
  const allowed =
    choice === "auto" ? Object.values(groups).flat() : groups[choice];
  const values = new Float32Array(width * height);
  let confident = 0;
  for (let k = 0; k < values.length; k++) {
    let v = 0;
    for (const index of allowed) v += masks[index].values[k];
    values[k] = Math.min(1, v);
    if (v >= 0.75) confident++;
  }
  // A few stray pixels do not constitute a useful cutout. The caller keeps the
  // complete source when this fails, instead of returning an almost erased pet.
  if (confident < Math.max(4, values.length * 0.005))
    throw Error("cutout/no-confident-subject");
  const mass = (indices: number[]) =>
    indices.reduce(
      (sum, index) =>
        sum + masks[index].values.reduce((s, v) => s + (v >= 0.5 ? v : 0), 0),
      0,
    );
  const subjectKind =
    choice === "auto"
      ? (Object.keys(groups) as PhotoSubject[]).sort(
          (a, b) => mass(groups[b]) - mass(groups[a]),
        )[0]
      : choice;
  const refinePeople =
    subjectKind === "people" &&
    (Object.keys(groups) as PhotoSubject[])
      .filter((k) => k !== "people")
      .every((k) => mass(groups[k]) < Math.max(1, values.length * 0.005));
  return { mask: { width, height, values }, subjectKind, refinePeople };
}
