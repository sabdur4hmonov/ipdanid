import { faceFeatures, type SourceFace } from "./core/face-features";
const ROOT = "/vendor/portrait-segmentation";
export async function detectSourceFaces(
  source: HTMLCanvasElement | OffscreenCanvas | ImageBitmap,
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
    return model
      .detect(c)
      .faceLandmarks.map(faceFeatures)
      .sort((a: SourceFace, b: SourceFace) => a.face.left - b.face.left);
  } finally {
    model.close();
  }
}
