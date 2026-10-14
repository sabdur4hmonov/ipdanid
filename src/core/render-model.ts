import type { Instruction } from "./types";
import { CAPABILITIES } from "./capabilities";
export function usesOpticalRaster(algorithm: Instruction["algorithm"]) {
  return CAPABILITIES[algorithm]?.render === "optical-raster";
}
