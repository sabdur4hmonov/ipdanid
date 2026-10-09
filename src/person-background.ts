import {
  foregroundAlpha,
  validatePersonMask,
  type PersonMask,
} from "./core/person-mask";
const ROOT = "/vendor/portrait-segmentation";
type Segmenter = {
  segment: (image: HTMLCanvasElement) => {
    confidenceMasks?: {
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
  if (!model)
    model = (async () => {
      // Pinned, self-hosted runtime: neither photos nor inference requests leave the device.
      const { FilesetResolver, ImageSegmenter } = await import(
        /* @vite-ignore */ `${ROOT}/vision_bundle.js`
      );
      const files = await FilesetResolver.forVisionTasks(`${ROOT}/wasm`);
      // The PWA cache already owns this immutable asset. Avoid Chromium's second
      // HTTP disk-cache write racing the service-worker install on a large model.
      const response = await fetch(`${ROOT}/selfie_multiclass_256x256.tflite`, {
        cache: "no-store",
      });
      if (!response.ok) throw Error("Local segmentation model unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
      if (
        hash !==
        "c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0"
      )
        throw Error("Local segmentation model integrity mismatch");
      return (await ImageSegmenter.createFromOptions(files, {
        baseOptions: {
          modelAssetBuffer: bytes,
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      })) as Segmenter;
    })().catch((e) => {
      model = undefined;
      throw e;
    });
  return model;
}
export async function segmentPeople(
  source: HTMLCanvasElement,
  stillWanted: () => boolean = () => true,
): Promise<PersonMask> {
  const segmenter = await getModel();
  if (!stillWanted()) throw new DOMException("Superseded photo", "AbortError");
  // No largest-component filtering: every foreground person is retained.
  const input = document.createElement("canvas"),
    scale = Math.min(1, 512 / Math.max(source.width, source.height));
  input.width = Math.max(1, Math.round(source.width * scale));
  input.height = Math.max(1, Math.round(source.height * scale));
  input.getContext("2d")!.drawImage(source, 0, 0, input.width, input.height);
  const result = segmenter.segment(input);
  try {
    const masks = result.confidenceMasks;
    if (!masks?.length) throw Error("No segmentation mask");
    const labels = segmenter.getLabels();
    const index = labels.findIndex((s) => /^background$/i.test(s));
    // Retain every hair/skin/face/clothing/accessory pixel, including separate people.
    if (index !== 0 || masks.length !== 6)
      throw Error("Unexpected segmentation labels");
    const m = masks[index];
    const mask = {
      width: m.width,
      height: m.height,
      values: Float32Array.from(m.getAsFloat32Array(), (v) => 1 - v),
    };
    // Float output can overshoot by tiny rounding amounts, but never accept NaN.
    mask.values = Float32Array.from(mask.values, (v) =>
      Math.max(0, Math.min(1, v)),
    );
    validatePersonMask(mask);
    if (
      mask.values.filter((v) => v >= 0.75).length <
      mask.values.length * 0.002
    )
      throw Error("No confident person detected");
    return mask;
  } finally {
    result.close();
  }
}
export function whiteBackground(source: HTMLCanvasElement, mask: PersonMask) {
  validatePersonMask(mask);
  const alpha = document.createElement("canvas");
  alpha.width = mask.width;
  alpha.height = mask.height;
  const a = alpha.getContext("2d")!,
    pixels = a.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.values.length; i++) {
    pixels.data.set(
      [255, 255, 255, Math.round(255 * foregroundAlpha(mask.values[i]))],
      i * 4,
    );
  }
  a.putImageData(pixels, 0, 0);
  const c = document.createElement("canvas");
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(alpha, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-over";
  return c;
}
