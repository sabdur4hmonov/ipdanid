import { inside } from "./geometry";
import { displayBox } from "./coordinates";
import { portraitPeople } from "./portrait";
import { portraitSampling } from "./portrait-sampling";
import { panCrop, zoomCrop } from "./shape-crop";
import type { SubjectKind } from "./subject-plan";
import type { EditParams, PortraitSettings, RegionBox, Shape } from "./types";

// Advice for an unsuitable-looking photo, measured on the exact processed
// target that generation would receive. Advice never blocks generation and is
// not a quality score: every item is a heuristic with a one-tap correction.
export const FEATURE_MIN_SAMPLES = 8;
// General subjects have no detected features. A visible detail (wheel, eye,
// handle) is taken as roughly a quarter of the marked subject's span.
export const GENERAL_DETAIL_FRACTION = 0.25;
export const MAX_PEOPLE = 3;
// Luminance standard deviation (0–255) inside the board shape; same scale as the
// existing whole-photo suitability check.
export const LOW_CONTRAST_STD = 30;
// Variance of the 4-neighbour Laplacian over textured samples (0–255 luminance).
// Heuristic: synthetic sharp targets measure >3000, 3x box-blur r=1 measures
// 38-200 and r=2 below 30 (see tests/subject-advice.test.ts). Kept low so
// ordinary soft photos are rarely flagged.
export const BLUR_LAPLACIAN_VARIANCE = 60;
const TEXTURE_GRADIENT = 6;
const WHITE = 247;

export type AdviceKey = "small" | "many-people" | "contrast" | "blur";
export type AdviceFix = "zoom" | "crop" | "photo";
export interface AdviceItem {
  key: AdviceKey;
  fix: AdviceFix;
  /** 1-based person for per-person advice. */
  person?: number;
  /** Measured value behind the advice, in the unit of its threshold. */
  value: number;
  threshold: number;
}
export interface SubjectAdviceInput {
  pixels: Uint8Array;
  n: number;
  shape: Shape;
  kind: SubjectKind;
  portrait: PortraitSettings;
  /** Faces reported by the local detector for this photo, if analysed. */
  detectedPeople?: number;
  /** True when a manual subject mask whitened the background of this target. */
  masked?: boolean;
}
export interface SubjectAdviceResult {
  items: AdviceItem[];
  contrast: number;
  laplacianVariance: number;
  /** Subject bounds on the sample-centre reference, when known. */
  subject?: RegionBox;
  advisoryOnly: true;
}
function luminance(pixels: Uint8Array, n: number) {
  return Float32Array.from(
    { length: n * n },
    (_, i) =>
      0.2126 * pixels[i * 3] +
      0.7152 * pixels[i * 3 + 1] +
      0.0722 * pixels[i * 3 + 2],
  );
}
export function laplacianVariance(
  gray: Float32Array,
  n: number,
  within: (x: number, y: number) => boolean,
) {
  let sum = 0,
    sum2 = 0,
    count = 0;
  for (let y = 1; y < n - 1; y++)
    for (let x = 1; x < n - 1; x++) {
      if (
        !within(x, y) ||
        !within(x - 1, y) ||
        !within(x + 1, y) ||
        !within(x, y - 1) ||
        !within(x, y + 1)
      )
        continue;
      const i = y * n + x,
        gx = gray[i + 1] - gray[i - 1],
        gy = gray[i + n] - gray[i - n];
      // Flat background (white masks, sky) would otherwise read as blur.
      if (Math.hypot(gx, gy) < TEXTURE_GRADIENT) continue;
      const lap =
        gray[i - 1] + gray[i + 1] + gray[i - n] + gray[i + n] - 4 * gray[i];
      sum += lap;
      sum2 += lap * lap;
      count++;
    }
  return count < 16 ? 0 : sum2 / count - (sum / count) ** 2;
}
export function subjectAdvice(o: SubjectAdviceInput): SubjectAdviceResult {
  const { pixels, n, shape } = o;
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 320 ||
    pixels.length !== n * n * 3 ||
    !["circle", "rectangle", "heart"].includes(shape)
  )
    throw Error("Invalid advice target");
  const gray = luminance(pixels, n);
  const shapeMask = new Uint8Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      shapeMask[y * n + x] = +inside(shape, x / (n - 1), y / (n - 1));
  const within = (x: number, y: number) => shapeMask[y * n + x] === 1;
  let sum = 0,
    sum2 = 0,
    count = 0;
  for (let i = 0; i < gray.length; i++)
    if (shapeMask[i]) {
      sum += gray[i];
      sum2 += gray[i] ** 2;
      count++;
    }
  const contrast = count
    ? Math.sqrt(Math.max(0, sum2 / count - (sum / count) ** 2))
    : 0;
  const lapVar = laplacianVariance(gray, n, within);
  const items: AdviceItem[] = [];
  const people = o.kind === "people" && o.portrait.enabled;
  let subject: RegionBox | undefined;
  if (people) {
    const persons = portraitPeople(o.portrait);
    persons.forEach((person, k) => {
      const sampling = portraitSampling(pixels, n, shape, person),
        span = Math.min(
          ...sampling.map((r) => Math.min(r.widthPixels, r.heightPixels)),
        );
      if (span < FEATURE_MIN_SAMPLES)
        items.push({
          key: "small",
          fix: "zoom",
          person: k + 1,
          value: span,
          threshold: FEATURE_MIN_SAMPLES,
        });
    });
    const l = Math.min(...persons.map((p) => p.face.left)),
      t = Math.min(...persons.map((p) => p.face.top)),
      r = Math.max(...persons.map((p) => p.face.left + p.face.width)),
      b = Math.max(...persons.map((p) => p.face.top + p.face.height));
    subject = { left: l, top: t, width: r - l, height: b - t };
  } else if (o.masked) {
    // Manual subject mask: the background is white on this exact target.
    let l = n,
      t = n,
      r = -1,
      b = -1;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (!shapeMask[i]) continue;
        if (
          Math.min(pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]) >= WHITE
        )
          continue;
        l = Math.min(l, x);
        t = Math.min(t, y);
        r = Math.max(r, x);
        b = Math.max(b, y);
      }
    if (r >= l && b >= t) {
      subject = {
        left: l / (n - 1),
        top: t / (n - 1),
        width: Math.max(1, r - l) / (n - 1),
        height: Math.max(1, b - t) / (n - 1),
      };
      const span = Math.min(r - l, b - t) * GENERAL_DETAIL_FRACTION;
      if (span < FEATURE_MIN_SAMPLES)
        items.push({
          key: "small",
          fix: "zoom",
          value: span,
          threshold: FEATURE_MIN_SAMPLES,
        });
    }
  }
  const peopleCount = Math.max(
    people ? portraitPeople(o.portrait).length : 0,
    o.kind === "people" ? (o.detectedPeople ?? 0) : 0,
  );
  if (peopleCount > MAX_PEOPLE)
    items.push({
      key: "many-people",
      fix: "photo",
      value: peopleCount,
      threshold: MAX_PEOPLE,
    });
  if (contrast < LOW_CONTRAST_STD)
    items.push({
      key: "contrast",
      fix: subject ? "crop" : "photo",
      value: contrast,
      threshold: LOW_CONTRAST_STD,
    });
  if (lapVar > 0 && lapVar < BLUR_LAPLACIAN_VARIANCE)
    items.push({
      key: "blur",
      fix: "photo",
      value: lapVar,
      threshold: BLUR_LAPLACIAN_VARIANCE,
    });
  return {
    items,
    contrast,
    laplacianVariance: lapVar,
    subject,
    advisoryOnly: true,
  };
}
/**
 * One-tap zoom/crop correction: enlarge around the subject and centre it.
 * Without known subject bounds it zooms about the board centre.
 */
export function adviceCrop(
  edits: EditParams,
  subject: RegionBox | undefined,
  aspect: number,
  n: number,
  minSpanSamples?: number,
): EditParams {
  const box = subject ? displayBox(subject, n) : undefined;
  const anchor = box
    ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    : { x: 0.5, y: 0.5 };
  // Enough to reach the minimum span, but keep the whole subject on the board.
  const wanted = minSpanSamples
    ? (FEATURE_MIN_SAMPLES + 0.5) / Math.max(0.5, minSpanSamples)
    : 1.35;
  const room = box ? 0.92 / Math.max(box.width, box.height, 1e-3) : 2;
  const factor = Math.max(1.1, Math.min(2, wanted, Math.max(1.1, room)));
  const zoomed = zoomCrop(edits, factor, anchor, aspect);
  return panCrop(zoomed, 0.5 - anchor.x, 0.5 - anchor.y, aspect);
}
