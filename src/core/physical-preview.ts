import type { Instruction } from "./types";
import { referenceRaster } from "./classic-reference";

// Same raster/quantization as renderInstruction, executed in the generator
// worker. The UI only copies opaque pixels; no photo or painted details.
export function physicalPreviewRgba(
  i: Instruction,
): Uint8ClampedArray<ArrayBuffer> {
  if (
    i.algorithm !== "classic-greedy/3" ||
    i.profile.standardKit?.referenceRender !== "classic-coverage/2"
  )
    throw Error("physical-preview/combination");
  const raster = referenceRaster(i, 1000),
    rgba = new Uint8ClampedArray(1000 * 1000 * 4);
  for (let k = 0; k < 1000 * 1000; k++) {
    for (let c = 0; c < 3; c++)
      rgba[k * 4 + c] = Math.round(raster[k * 3 + c] * 255);
    rgba[k * 4 + 3] = 255;
  }
  return rgba;
}
