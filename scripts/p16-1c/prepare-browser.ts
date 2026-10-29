import { faceFeatures, type Landmark } from "../../src/core/face-features";
import { segmentPeople } from "../../src/person-background";
import { cleanupBackground } from "../../src/background-cleanup";
import { referenceToneCanvas } from "../../src/core/portrait-framing";
import { freePhotoCanvas } from "../../src/core/free-photo-framing";
import { closerFraming, fadeBelowChin, type FramingLevel } from "./framing";
import type { RegionBox, Shape } from "../../src/core/types";

const prepared = new Map<string, HTMLCanvasElement>();
type Model = {
  detect: (image: HTMLCanvasElement) => { faceLandmarks: Landmark[][] };
};
let faceModel: Model | undefined;
async function detectAnchors(source: HTMLCanvasElement) {
  if (!faceModel) {
    const root = "/vendor/portrait-segmentation";
    const { FaceLandmarker, FilesetResolver } = await import(
      /* @vite-ignore */ `${root}/vision_bundle.js`
    );
    const bytes = new Uint8Array(
      await (await fetch(`${root}/face_landmarker.task`)).arrayBuffer(),
    );
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (v) => v.toString(16).padStart(2, "0"),
    ).join("");
    if (
      hash !==
      "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"
    )
      throw Error("p16-1c/face-model-integrity");
    faceModel = (await FaceLandmarker.createFromOptions(
      await FilesetResolver.forVisionTasks(`${root}/wasm`),
      {
        baseOptions: { modelAssetBuffer: bytes, delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 4,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      },
    )) as Model;
  }
  const canvas = document.createElement("canvas"),
    scale = Math.min(1, 768 / Math.max(source.width, source.height));
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  const landmarks = faceModel.detect(canvas).faceLandmarks;
  if (landmarks.length !== 1) throw Error("p16-1c/one-source-person-required");
  return {
    detected: faceFeatures(landmarks[0]),
    nose: { x: landmarks[0][1].x, y: landmarks[0][1].y },
  };
}
const base64 = (bytes: Uint8Array) => {
  let s = "";
  for (let k = 0; k < bytes.length; k += 8192)
    s += String.fromCharCode(...bytes.subarray(k, k + 8192));
  return btoa(s);
};
export async function analyze(id: string, data: string) {
  const start = performance.now(),
    image = new Image();
  image.src = data;
  await image.decode();
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  source.getContext("2d")!.drawImage(image, 0, 0);
  const anchors = await detectAnchors(source);
  const bitmap = await createImageBitmap(source);
  let mask = await segmentPeople(bitmap);
  try {
    mask = await cleanupBackground(bitmap, mask, () => true);
  } finally {
    bitmap.close();
  }
  const tonal = referenceToneCanvas(source, mask);
  prepared.set(id, tonal);
  return {
    nose: anchors.nose,
    noseAnchor: "existing-face-landmarker/point-1-tip",
    detected: anchors.detected,
    width: source.width,
    height: source.height,
    analysisMs: performance.now() - start,
  };
}
export function frame(
  id: string,
  face: RegionBox,
  nose: { x: number; y: number },
  shape: Shape,
  level: FramingLevel,
) {
  const start = performance.now(),
    source = prepared.get(id);
  if (!source) throw Error("p16-1c/source-not-prepared");
  const framing = closerFraming(
    face,
    nose,
    shape,
    source.width / source.height,
    level,
  );
  const framed = freePhotoCanvas(source, framing.transform, shape);
  const pixels = fadeBelowChin(framed.pixels, framing.targetChin);
  return {
    framing,
    frameMs: performance.now() - start,
    pixels: base64(pixels),
  };
}
Object.assign(window, { p16framing: { analyze, frame } });
declare global {
  interface Window {
    p16framing: { analyze: typeof analyze; frame: typeof frame };
  }
}
