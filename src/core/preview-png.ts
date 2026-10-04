import UPNG from "@pdf-lib/upng";
import type { Instruction } from "./types";
import { rasterSequence } from "./optical";

export function previewPng(i: Instruction): Uint8Array {
  const n = i.params.resolution,
    raster = rasterSequence(i);
  const rgba = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    for (let c = 0; c < 3; c++)
      rgba[k * 4 + c] = Math.round(raster[k * 3 + c] * 255);
    rgba[k * 4 + 3] = 255;
  }
  return new Uint8Array(UPNG.encode([rgba.buffer], n, n, 0));
}
