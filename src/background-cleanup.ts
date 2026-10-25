import { cleanUncertainBackground } from "./core/background-cleanup";
import type { PersonMask } from "./core/person-mask";
import { semanticCutout, type CutoutChoice } from "./core/semantic-cutout";
const ROOT = "/vendor/portrait-segmentation";
type Segmenter = {
  segment: (input: OffscreenCanvas) => {
    confidenceMasks: {
      width: number;
      height: number;
      getAsFloat32Array: () => Float32Array;
    }[];
    close: () => void;
  };
  getLabels: () => string[];
};
let model: Promise<Segmenter> | undefined;
async function getModel() {
  return (model ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import(
      /* @vite-ignore */ `${ROOT}/vision_bundle.js`
    );
    const response = await fetch(`${ROOT}/deeplab_v3.tflite`, {
      cache: "no-store",
    });
    if (!response.ok) throw Error("Background cleanup model unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer()),
      hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
    if (
      hash !==
      "ff36e24d40547fe9e645e2f4e8745d1876d6e38b332d39a82f0bf0f5d1d561b3"
    )
      throw Error("Background cleanup model integrity mismatch");
    return (await ImageSegmenter.createFromOptions(
      await FilesetResolver.forVisionTasks(`${ROOT}/wasm`),
      {
        baseOptions: { modelAssetBuffer: bytes, delegate: "CPU" },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      },
    )) as Segmenter;
  })().catch((error) => {
    model = undefined;
    throw error;
  }));
}
export async function cleanupBackground(
  image: ImageBitmap | OffscreenCanvas,
  primary: PersonMask,
  stillWanted: () => boolean,
) {
  const segmenter = await getModel();
  if (!stillWanted()) throw new DOMException("Superseded photo", "AbortError");
  const scale = Math.min(1, 512 / Math.max(image.width, image.height)),
    c = new OffscreenCanvas(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
  c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
  const output = segmenter.segment(c);
  try {
    const labels = segmenter.getLabels();
    if (
      labels.length !== 21 ||
      labels[15] !== "person" ||
      output.confidenceMasks.length !== 21
    )
      throw Error("Unexpected semantic person labels");
    const m = output.confidenceMasks[15];
    return cleanUncertainBackground(primary, {
      width: m.width,
      height: m.height,
      values: Float32Array.from(m.getAsFloat32Array()),
    });
  } finally {
    output.close();
  }
}

export async function segmentPhotoSubject(
  image: ImageBitmap | OffscreenCanvas,
  choice: CutoutChoice,
  stillWanted: () => boolean,
) {
  const segmenter = await getModel();
  if (!stillWanted()) throw new DOMException("Superseded photo", "AbortError");
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = segmenter.segment(canvas);
  try {
    return semanticCutout(
      segmenter.getLabels(),
      result.confidenceMasks.map((m) => ({
        width: m.width,
        height: m.height,
        values: Float32Array.from(m.getAsFloat32Array(), (v) =>
          Math.max(0, Math.min(1, v)),
        ),
      })),
      choice,
    );
  } finally {
    result.close();
  }
}
