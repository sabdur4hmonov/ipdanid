import type { PortraitSettings, RegionBox } from "./types";
import { contains, portraitRegions } from "./portrait";

// Importance changes the loss only. It never changes target pixels or anatomy.
export interface AnatomicalImportance {
  version: "manual-nose-lip-importance/1";
  reference: "processed-target/sample-centers-v1";
  taper: "raised-cosine/1";
  noseMultiplier: number;
  mouthMultiplier: number;
}
export const DEFAULT_ANATOMICAL_IMPORTANCE: AnatomicalImportance = {
  version: "manual-nose-lip-importance/1",
  reference: "processed-target/sample-centers-v1",
  taper: "raised-cosine/1",
  noseMultiplier: 3,
  mouthMultiplier: 3,
};
export function validAnatomicalImportance(value: AnatomicalImportance) {
  if (
    !value ||
    value.version !== "manual-nose-lip-importance/1" ||
    value.reference !== "processed-target/sample-centers-v1" ||
    value.taper !== "raised-cosine/1" ||
    ![value.noseMultiplier, value.mouthMultiplier].every(
      (v) => Number.isFinite(v) && v >= 1 && v <= 4,
    )
  )
    throw Error("Invalid anatomical importance settings");
}
export function anatomicalImportance(
  portrait: PortraitSettings,
  tuning?: AnatomicalImportance,
) {
  if (tuning) {
    validAnatomicalImportance(tuning);
    if (
      !portrait?.enabled ||
      portrait.regions?.placement !== "manual" ||
      portrait.regions.reference !== tuning.reference
    )
      throw Error(
        "Anatomical importance requires source-aligned manual regions",
      );
  }
  const regions = portraitRegions(portrait);
  const taper = (box: RegionBox, x: number, y: number) => {
    if (!contains(box, x, y)) return 0;
    // Zero value and zero derivative at box edges, peak one at its center.
    const xx = (x - box.left) / box.width,
      yy = (y - box.top) / box.height;
    return (
      ((1 - Math.cos(2 * Math.PI * xx)) * (1 - Math.cos(2 * Math.PI * yy))) / 4
    );
  };
  return (x: number, y: number) => {
    let base = contains(regions.face, x, y) ? 8 : 1;
    if (["eyes", "nose", "mouth"].some((key) => contains(regions[key], x, y)))
      base = 16;
    if (!tuning || contains(regions.eyes, x, y)) return base;
    return (
      base +
      16 *
        Math.max(
          (tuning.noseMultiplier - 1) * taper(regions.nose, x, y),
          (tuning.mouthMultiplier - 1) * taper(regions.mouth, x, y),
        )
    );
  };
}
