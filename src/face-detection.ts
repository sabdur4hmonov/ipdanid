import {
  faceFeatures,
  distinctSourceFaces,
  type SourceFace,
} from "./core/face-features";
import { unturnFaces, type QuarterTurn } from "./core/photo-orientation";
const ROOT = "/vendor/portrait-segmentation";
const MODEL_SHA256 =
  "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";
type Landmarker = {
  detect: (image: HTMLCanvasElement | OffscreenCanvas) => {
    faceLandmarks: Parameters<typeof faceFeatures>[0][];
  };
  close: () => void;
};
// One verified model per worker/page session: fetching ~4 MB, hashing it and
// compiling the WASM graph on every photo dominated repeated analysis time.
let landmarker: Promise<Landmarker> | undefined;
let closed: Landmarker | undefined;
export let faceModelLoads = 0;
function getLandmarker() {
  if (!landmarker)
    landmarker = (async () => {
      faceModelLoads++;
      const { FilesetResolver, FaceLandmarker } = await import(
        /* @vite-ignore */ `${ROOT}/vision_bundle.js`
      );
      const response = await fetch(`${ROOT}/face_landmarker.task`, {
        cache: "no-store",
      });
      if (!response.ok) throw Error("Local face model unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== MODEL_SHA256)
        throw Error("Local face model integrity mismatch");
      return (await FaceLandmarker.createFromOptions(
        await FilesetResolver.forVisionTasks(`${ROOT}/wasm`),
        {
          baseOptions: { modelAssetBuffer: bytes, delegate: "CPU" },
          runningMode: "IMAGE",
          numFaces: 4,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        },
      )) as Landmarker;
    })().catch((e) => {
      // A failed load (offline asset, integrity mismatch) may be retried later.
      landmarker = undefined;
      throw e;
    });
  return landmarker;
}
/** Releases the cached native model. Safe to call repeatedly. */
export async function closeFaceDetector() {
  const pending = landmarker;
  landmarker = undefined;
  if (!pending) return;
  try {
    const model = await pending;
    if (model !== closed) {
      closed = model;
      model.close();
    }
  } catch {
    /* Nothing was created. */
  }
}
export async function detectSourceFaces(
  source: HTMLCanvasElement | OffscreenCanvas | ImageBitmap,
  stillWanted: () => boolean = () => true,
  result?: { turn: QuarterTurn },
): Promise<SourceFace[]> {
  const model = await getLandmarker();
  if (!stillWanted()) throw new DOMException("Superseded photo", "AbortError");
  const scale = Math.min(1, 768 / Math.max(source.width, source.height));
  const c =
    typeof document === "undefined"
      ? new OffscreenCanvas(
          Math.round(source.width * scale),
          Math.round(source.height * scale),
        )
      : document.createElement("canvas");
  c.width = Math.max(1, Math.round(source.width * scale));
  c.height = Math.max(1, Math.round(source.height * scale));
  (
    c.getContext("2d") as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ).drawImage(source, 0, 0, c.width, c.height);
  let best: SourceFace[] = [],
    selected: QuarterTurn = 0;
  // Upside-down group photos can hide a second face from the upright model.
  // Search is bounded; ties keep the original orientation. Geometry returns to source edges.
  for (const turn of [0, 2, 1, 3] as QuarterTurn[]) {
    if (!stillWanted())
      throw new DOMException("Superseded photo", "AbortError");
    const rotated =
      typeof document === "undefined"
        ? new OffscreenCanvas(1, 1)
        : document.createElement("canvas");
    rotated.width = turn % 2 ? c.height : c.width;
    rotated.height = turn % 2 ? c.width : c.height;
    const ctx = rotated.getContext("2d") as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate((turn * Math.PI) / 2);
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    const faces: SourceFace[] = distinctSourceFaces(
      model.detect(rotated).faceLandmarks.map(faceFeatures),
    );
    if (faces.length > best.length) {
      best = unturnFaces(faces, turn);
      selected = turn;
    }
    if (best.length >= 4) break;
    // Give cancellation a task boundary between native inference calls.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (result) result.turn = selected;
  return best;
}
