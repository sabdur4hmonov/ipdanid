import { faceFeatures, type SourceFace } from "./core/face-features";
import { unturnFaces, type QuarterTurn } from "./core/photo-orientation";
const ROOT = "/vendor/portrait-segmentation";
export async function detectSourceFaces(
  source: HTMLCanvasElement | OffscreenCanvas | ImageBitmap,
  stillWanted: () => boolean = () => true,
  result?: { turn: QuarterTurn },
): Promise<SourceFace[]> {
  const { FilesetResolver, FaceLandmarker } = await import(
    /* @vite-ignore */ `${ROOT}/vision_bundle.js`
  );
  const bytes = new Uint8Array(
    await (
      await fetch(`${ROOT}/face_landmarker.task`, { cache: "no-store" })
    ).arrayBuffer(),
  );
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  if (
    hash !== "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"
  )
    throw Error("Local face model integrity mismatch");
  const model = await FaceLandmarker.createFromOptions(
    await FilesetResolver.forVisionTasks(`${ROOT}/wasm`),
    {
      baseOptions: { modelAssetBuffer: bytes, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 4,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    },
  );
  try {
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
      const faces: SourceFace[] = model
        .detect(rotated)
        .faceLandmarks.map(faceFeatures);
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
  } finally {
    model.close();
  }
}
