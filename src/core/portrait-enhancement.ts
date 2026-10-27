import type { GenerateOptions } from "./engine";
import type { Instruction } from "./types";
import {
  generateClassicLeastSquares,
  squareChordExcluded,
} from "./classic-least-squares";
import { ClassicScoreGeometry } from "./classic-score-cache";
import { referenceRaster } from "./classic-reference";
import { sourceMidcontrast } from "./source-midcontrast";
import { portraitViewingImage, viewingSsimPrepared } from "./viewing-ssim";
import { viewingMask } from "./viewing-mask";

export type PortraitDetailScore = {
  faces: { face: number; nose: number; eyes: number; mouth: number }[];
  white: number;
};
export function portraitDetailImproves(
  before: PortraitDetailScore,
  after: PortraitDetailScore,
) {
  const finite = (s: PortraitDetailScore) =>
    Number.isFinite(s.white) &&
    s.faces.every((f) => Object.values(f).every(Number.isFinite));
  return (
    finite(before) &&
    finite(after) &&
    before.faces.length > 0 &&
    before.faces.length === after.faces.length &&
    after.white <= before.white + 0.01 &&
    after.faces.every((f, k) => {
      const b = before.faces[k];
      return (
        f.face >= b.face + 0.02 &&
        f.nose >= b.nose + 0.03 &&
        f.eyes >= b.eyes - 0.005 &&
        f.mouth >= b.mouth - 0.005
      );
    })
  );
}
export function portraitDetailScore(
  pixels: Uint8Array,
  i: Instruction,
  preparedTargetView?: Float32Array,
): PortraitDetailScore {
  if (pixels.length !== 500 * 500 * 3)
    throw Error("portrait-detail/target-size");
  const faces = i.params.kitPreparation?.transform.targetFaces ?? [];
  if (!faces.length || faces.length > 3) throw Error("portrait-detail/faces");
  const target = Float32Array.from(
      { length: 250000 },
      (_, k) => pixels[k * 3] / 255,
    ),
    targetView = preparedTargetView ?? portraitViewingImage(target, 500, faces),
    rgb = referenceRaster(i, 1000),
    mono = new Float32Array(1000 * 1000),
    boardMask = viewingMask(i.profile.shape, 160),
    mask = viewingMask(i.profile.shape, 1000);
  for (let k = 0; k < mono.length; k++) mono[k] = rgb[k * 3];
  const view = portraitViewingImage(mono, 1000, faces);

  const regions = faces.flatMap((f) => {
    const b = (x: number, y: number, w: number, h: number) => ({
      left: f.left + x * f.width,
      top: f.top + y * f.height,
      width: f.width * w,
      height: f.height * h,
    });
    return [
      b(0.3, 0.35, 0.4, 0.4),
      b(0.1, 0.18, 0.8, 0.24),
      b(0.2, 0.7, 0.6, 0.23),
    ];
  });
  const measured = viewingSsimPrepared(view, targetView, {
    faces,
    regions,
    boardMask,
  });
  const scores = faces.map((_, k) => ({
    face: measured.faces[k].ssim,
    nose: measured.regions![k * 3].ssim,
    eyes: measured.regions![k * 3 + 1].ssim,
    mouth: measured.regions![k * 3 + 2].ssim,
  }));
  let sum = 0,
    count = 0;
  for (let y = 0; y < 1000; y++)
    for (let x = 0; x < 1000; x++)
      if (
        mask[y * 1000 + x] &&
        target[Math.floor(y / 2) * 500 + Math.floor(x / 2)] > 0.98
      ) {
        sum += 1 - rgb[(y * 1000 + x) * 3];
        count++;
      }
  return { faces: scores, white: count ? sum / count : 0 };
}

// Bounded two-candidate preparation selection, not a new/modified /3 solver.
// Both physical paths are measured against the ORIGINAL reviewed target. A
// failed/unhelpful candidate cannot replace a valid baseline. No feature painting.
export async function generatePortraitEnhanced(
  o: GenerateOptions & { onCheckpoint?: (i: Instruction) => void },
): Promise<Instruction> {
  const started = performance.now(),
    proof = o.kitPreparation;
  if (
    o.resolution !== 500 ||
    ![2500, 3000, 3500].includes(o.lines) ||
    proof?.version !== "standard-preparation/9" ||
    proof.transform.product?.kind !== "people" ||
    proof.transform.caption ||
    !proof.transform.targetFaces?.length ||
    proof.transform.targetFaces.length > 3
  )
    return generateClassicLeastSquares(o);
  const filtered = sourceMidcontrast(o.pixels, 500);
  let changed = false;
  for (let k = 0; k < filtered.length; k++)
    if (filtered[k] !== o.pixels[k]) {
      changed = true;
      break;
    }
  if (!changed) return generateClassicLeastSquares(o); // Identical candidates cannot clear the gain gates.
  let geometry: ClassicScoreGeometry | undefined;
  try {
    geometry = new ClassicScoreGeometry(
      o.profile,
      500,
      (a, b) => squareChordExcluded(o.profile, a, b),
      o.cancelled,
    );
  } catch {
    if (o.cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    o.onDiagnostic?.({ stage: "portrait-detail-cache", available: false });
  }
  const baseline = await generateClassicLeastSquares(
    {
      ...o,
      onProgress: (p) => o.onProgress?.(p * 0.45),
    },
    geometry,
  );
  let selected = baseline,
    reason = "baseline";
  try {
    if (o.cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    {
      const pixels = filtered,
        parentImageHash = baseline.imageHash;
      const candidate = await generateClassicLeastSquares(
        {
          ...o,
          pixels,
          seed: undefined,
          onCheckpoint: undefined,
          kitPreparation: {
            ...structuredClone(proof),
            version: "standard-preparation/10",
            tone: { version: "quality-gated-midcontrast/1", parentImageHash },
          },
          cancelled: () => !!o.cancelled?.(),
          onProgress: (p) => o.onProgress?.(0.45 + p * 0.4),
        },
        geometry,
      );
      {
        o.onProgress?.(0.9);
        const targetView = portraitViewingImage(
          Float32Array.from(
            { length: 250000 },
            (_, k) => o.pixels[k * 3] / 255,
          ),
          500,
          proof.transform.targetFaces,
        );
        const before = portraitDetailScore(o.pixels, baseline, targetView),
          after = portraitDetailScore(o.pixels, candidate, targetView);
        if (portraitDetailImproves(before, after)) {
          selected = candidate;
          reason = "enhanced";
        }
        o.onDiagnostic?.({
          stage: "portrait-detail-selection",
          selected: selected === candidate,
          before,
          after,
        });
      }
    }
  } catch {
    // Cancellation belongs to the caller; an optional enhancement failure is
    // fail-closed to the already valid original target/path, never a half guide.
    if (o.cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    reason = "baseline-candidate-unavailable";
  }
  o.onDiagnostic?.({
    stage: "portrait-detail-selection-done",
    selected: selected !== baseline,
    reason,
    durationMs: performance.now() - started,
  });
  o.onProgress?.(1);
  // Preserve the exact frozen guide identity and its cached1000px raster.
  // Core metrics retain solver timing; the Worker reports complete job duration.
  return selected;
}
