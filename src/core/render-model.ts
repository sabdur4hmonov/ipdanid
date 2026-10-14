import type { Instruction } from "./types";
// Exhaustive: a new sequence version must choose one representation for screen and PDF.
const models: Record<
  Instruction["algorithm"],
  "legacy-lines" | "optical-raster"
> = {
  "greedy-optical/1": "legacy-lines",
  "greedy-optical/2": "legacy-lines",
  "greedy-optical/3": "optical-raster",
  "greedy-optical/4": "optical-raster",
  "density-optical/5": "optical-raster",
  "continuous-guarded/6": "optical-raster",
  "density-multiscale/7": "optical-raster",
  "density-physical/8": "optical-raster",
  "assembly-prune/9": "optical-raster",
  "density-anatomy/10": "optical-raster",
  "density-pin-basis/11": "optical-raster",
  "density-resolved/12": "optical-raster",
  "density-head/13": "optical-raster",
  "hair-cycles/14": "optical-raster",
  "group-optical/15": "optical-raster",
  "density-feature/16": "optical-raster",
  "density-texture/17": "optical-raster",
};
export function usesOpticalRaster(algorithm: Instruction["algorithm"]) {
  return models[algorithm] === "optical-raster";
}
