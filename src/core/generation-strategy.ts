import type { Instruction } from "./types";
import {
  CAPABILITIES,
  getCapability,
  type GenerationStrategy,
} from "./capabilities";
export type { GenerationStrategy } from "./capabilities";
export function generationStrategy(i: Instruction): GenerationStrategy {
  const algorithm =
    i.algorithm === "assembly-prune/9"
      ? i.params.simplification?.sourceAlgorithm
      : i.algorithm;
  if (i.params.portrait?.people && algorithm !== "density-subject/18")
    return "guarded";
  const capability = algorithm ? getCapability(algorithm) : undefined;
  if (!capability) throw Error("Unsupported generation capability");
  return capability.strategy;
}
export function continuationStrategy(i: Instruction): GenerationStrategy {
  if (!CAPABILITIES[i.algorithm]?.canContinue) throw Error("lettering/rebuild");
  if (i.algorithm !== "density-subject/18") {
    if (i.algorithm === "density-texture/17") return "texture";
    if (i.params.subject && i.params.subject.kind !== "people")
      return i.algorithm === "greedy-optical/4" ? "continuous" : "guarded";
    if (i.params.portrait?.people) return "guarded";
  }
  if (!CAPABILITIES[i.algorithm])
    throw Error("Unsupported continuation capability");
  return CAPABILITIES[i.algorithm].continuation;
}
