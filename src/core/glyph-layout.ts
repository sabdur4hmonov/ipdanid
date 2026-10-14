import type { Instruction, MaterialProfile } from "./types";
import type { GlyphLayout } from "./lettering-contract";
import { validLetteringProduct } from "./lettering-contract";
import { hash } from "./engine";
import { assertPinSpacing } from "./geometry";
import { Distribution } from "./distribution";
export function glyphPath(layout: GlyphLayout) {
  const path: number[] = [];
  for (const contour of layout.contours) {
    path.push(contour.start);
    for (let j = 1; j < contour.count; j++) path.push(contour.start + j);
    path.push(contour.start);
  }
  return path;
}
export async function glyphCoordinateHash(
  p: MaterialProfile,
  layout: Omit<GlyphLayout, "coordinateHash">,
) {
  return hash({
    version: layout.version,
    templateVersion: layout.templateVersion,
    widthMm: p.widthMm,
    heightMm: p.heightMm,
    pins: p.pins,
    product: layout.product,
    contours: layout.contours,
    bridges: layout.bridges,
  });
}
export function validGlyphProfile(p: MaterialProfile) {
  const l = p.glyphLayout;
  if (
    !l ||
    l.version !== "glyph-outline/1" ||
    l.templateVersion !== "glyph-coordinates/1" ||
    l.bridges !== "between-closed-loops/1" ||
    !Array.isArray(l.contours) ||
    !l.contours.length ||
    l.contours.length > 80 ||
    !/^[0-9a-f]{64}$/.test(l.coordinateHash) ||
    p.shape !== "rectangle" ||
    p.version !== 7 ||
    p.pinLayout ||
    p.pinBasis ||
    p.minPinGap !== 1
  )
    throw Error("Invalid glyph outline template");
  validLetteringProduct(l.product);
  if (l.product.style !== "outline")
    throw Error("Invalid glyph outline product");
  let at = 0;
  for (const c of l.contours) {
    if (
      !Number.isInteger(c.start) ||
      c.start !== at ||
      !Number.isInteger(c.count) ||
      c.count < 3
    )
      throw Error("Invalid glyph contour pin ranges");
    at += c.count;
  }
  if (at !== p.pins.length) throw Error("Invalid glyph contour pin ranges");
  assertPinSpacing(p);
}
export async function validateGlyphInstruction(i: Instruction) {
  const p = i.profile,
    l = p.glyphLayout!;
  validGlyphProfile(p);
  if (
    i.algorithm !== "glyph-outline/19" ||
    JSON.stringify(i.params.product) !== JSON.stringify(l.product) ||
    i.params.mode !== "dark" ||
    i.params.portrait ||
    i.params.subject ||
    i.params.parentSequenceHash ||
    i.segments.length !== 1 ||
    p.colors.length !== 1 ||
    i.segments[0].color !== p.colors[0] ||
    JSON.stringify(i.segments[0].path) !== JSON.stringify(glyphPath(l))
  )
    throw Error("Invalid glyph outline sequence provenance");
  const { coordinateHash, ...payload } = l;
  if ((await glyphCoordinateHash(p, payload)) !== coordinateHash)
    throw Error("Glyph coordinates disagree with template hash");
  const o = i.params.optimization;
  if (
    o?.kind !== "glyph-outline" ||
    o.lookahead !== 0 ||
    o.coarseScale !== 1 ||
    o.minimumRelativeGain !== 0 ||
    o.pairLimit !== 32 ||
    o.pinDegreeLimit !== 160 ||
    Object.keys(o).some(
      (k) =>
        ![
          "kind",
          "lookahead",
          "coarseScale",
          "minimumRelativeGain",
          "pairLimit",
          "pinDegreeLimit",
        ].includes(k),
    )
  )
    throw Error("Invalid glyph construction settings");
  new Distribution(p.pins.length, i.segments);
  let meters = 0.5;
  const path = i.segments[0].path;
  for (let j = 1; j < path.length; j++) {
    const a = p.pins[path[j - 1]],
      b = p.pins[path[j]];
    meters +=
      ((Math.hypot((a.x - b.x) * p.widthMm, (a.y - b.y) * p.heightMm) +
        p.wrapAllowanceMm) /
        1000) *
      (1 + p.wasteFraction);
  }
  if (
    !Number.isFinite(i.metrics.estimatedMeters) ||
    Math.abs(meters - i.metrics.estimatedMeters) > 1e-5 ||
    Object.keys(i.metrics.perColorMeters ?? {}).length !== 1 ||
    !Number.isFinite(i.metrics.perColorMeters?.[p.colors[0]]) ||
    Math.abs(i.metrics.perColorMeters[p.colors[0]] - meters) > 1e-5 ||
    !Number.isFinite(i.metrics.stockShortfallMeters) ||
    Math.abs(
      i.metrics.stockShortfallMeters! - Math.max(0, meters - p.stockMeters),
    ) > 1e-5 ||
    i.metrics.weightedError
  )
    throw Error("Invalid glyph material accounting");
}
