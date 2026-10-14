import type { Instruction, MaterialProfile } from "./types";
import type { LetteringProduct, GlyphLayout } from "./lettering-contract";
import {
  shapeLettering,
  rasterLettering,
  letteringPins,
  type LetteringGeometry,
} from "./lettering";
import { createProfile } from "./geometry";
import { hash, rgb, sequencePayload } from "./engine";
import { glyphPath, glyphCoordinateHash } from "./glyph-layout";
import { rasterSequence } from "./optical";
import { validateInstruction } from "./validation";
import { makeSubjectPlan } from "./subject-plan";

export function letteringProduct(
  g: LetteringGeometry,
  style: LetteringProduct["style"],
): LetteringProduct {
  return {
    version: "thread-lettering/1",
    style,
    text: g.text,
    font: g.font,
    fontHash: g.fontHash,
    direction: g.direction,
    glyphs: [...g.glyphs],
    geometryVersion: g.version,
    toleranceMm: g.toleranceMm,
  };
}
export function letteringTarget(
  g: LetteringGeometry,
  p: MaterialProfile,
  n: number,
) {
  return rasterLettering(
    g,
    n,
    rgb(p.baseColor).map((v) => Math.round(v * 255)),
    rgb(p.colors[0]).map((v) => Math.round(v * 255)),
  );
}
export async function prepareLetteringTarget(
  g: LetteringGeometry,
  p: MaterialProfile,
  n: number,
  reviewed: boolean,
) {
  if (!reviewed) throw Error("lettering/review");
  if (
    g.shape !== p.shape ||
    g.widthMm !== p.widthMm ||
    g.heightMm !== p.heightMm ||
    p.glyphLayout
  )
    throw Error("lettering/strategy");
  const pixels = letteringTarget(g, p, n),
    imageHash = await hash(pixels),
    subject = makeSubjectPlan("whole-image", `lettering-${imageHash}`, {
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      brightness: 0,
      contrast: 1,
    });
  subject.subjects[0].bounds = { ...g.bounds };
  subject.subjects[0].reviewed = true;
  return { pixels, subject, product: letteringProduct(g, "target") };
}
export async function generateGlyphOutline(input: {
  text: string;
  fontBytes: Uint8Array;
  widthMm: number;
  heightMm: number;
  count: number;
  resolution: number;
}): Promise<Instruction> {
  const { widthMm, heightMm, count, resolution: n } = input;
  if (!Number.isInteger(n) || n < 32 || n > 320)
    throw Error("lettering/resolution");
  const g = await shapeLettering(input.text, input.fontBytes, {
      widthMm,
      heightMm,
      shape: "rectangle",
    }),
    p = createProfile("rectangle", count, "dark", { widthMm, heightMm }),
    pins = letteringPins(g, count, p.shaftMm + p.threadMm),
    product = letteringProduct(g, "outline");
  p.id = "glyph-outline-v1";
  p.version = 7;
  p.minPinGap = 1;
  p.pins = pins.pins;
  const layout: Omit<GlyphLayout, "coordinateHash"> = {
    version: "glyph-outline/1",
    templateVersion: "glyph-coordinates/1",
    product,
    contours: pins.contours,
    bridges: "between-closed-loops/1",
  };
  p.glyphLayout = {
    ...layout,
    coordinateHash: await glyphCoordinateHash(p, layout),
  };
  const path = glyphPath(p.glyphLayout),
    lines = path.length - 1,
    target = letteringTarget(g, p, n);
  let meters = 0.5;
  for (let j = 1; j < path.length; j++) {
    const a = p.pins[path[j - 1]],
      b = p.pins[path[j]];
    meters +=
      ((Math.hypot((a.x - b.x) * widthMm, (a.y - b.y) * heightMm) +
        p.wrapAllowanceMm) /
        1000) *
      (1 + p.wasteFraction);
  }
  const i: Instruction = {
    schema: "iprasm.instruction/1",
    algorithm: "glyph-outline/19",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    imageHash: await hash(target),
    sequenceHash: "",
    profile: p,
    segments: [{ color: p.colors[0], path }],
    params: {
      resolution: n,
      requestedLines: lines,
      mode: "dark",
      stockPolicy: "estimate",
      product,
      optimization: {
        kind: "glyph-outline",
        lookahead: 0,
        coarseScale: 1,
        minimumRelativeGain: 0,
        pairLimit: 32,
        pinDegreeLimit: 160,
      },
    },
    metrics: {
      lines,
      estimatedMeters: meters,
      perColorMeters: { [p.colors[0]]: meters },
      stockShortfallMeters: Math.max(0, meters - p.stockMeters),
      baselineMse: 0,
      reconstructionMse: 0,
      stoppedReason: "requested",
    },
  };
  const actual = rasterSequence(i),
    base = rgb(p.baseColor);
  let empty = 0,
    error = 0;
  for (let k = 0; k < target.length; k++) {
    empty += (target[k] / 255 - base[k % 3]) ** 2;
    error += (target[k] / 255 - actual[k]) ** 2;
  }
  i.metrics.baselineMse = empty / target.length;
  i.metrics.reconstructionMse = error / target.length;
  i.sequenceHash = await hash(sequencePayload(i));
  return validateInstruction(i);
}
