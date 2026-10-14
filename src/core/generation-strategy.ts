import type { Instruction } from "./types";
export type GenerationStrategy =
  | "continuous"
  | "guarded"
  | "global"
  | "multiscale"
  | "physical"
  | "anatomy"
  | "basis"
  | "features"
  | "texture"
  | "simplify";
export function generationStrategy(i: Instruction): GenerationStrategy {
  const algorithm =
    i.algorithm === "assembly-prune/9"
      ? i.params.simplification?.sourceAlgorithm
      : i.algorithm;
  if (algorithm === "density-feature/16") return "features";
  if (algorithm === "density-texture/17") return "texture";
  if (
    i.params.portrait?.people ||
    algorithm === "group-optical/15" ||
    algorithm === "continuous-guarded/6"
  )
    return "guarded";
  if (algorithm === "greedy-optical/4") return "continuous";
  if (
    [
      "density-pin-basis/11",
      "density-resolved/12",
      "density-head/13",
      "hair-cycles/14",
    ].includes(algorithm ?? "")
  )
    return "basis";
  if (algorithm === "density-anatomy/10") return "anatomy";
  if (algorithm === "density-physical/8") return "physical";
  if (algorithm === "density-multiscale/7") return "multiscale";
  return "global";
}
// One source of truth for both Worker dispatch and the Continue button.
export function continuationStrategy(i: Instruction): GenerationStrategy {
  if (i.algorithm === "density-texture/17") return "texture";
  if (i.params.subject && i.params.subject.kind !== "people")
    return i.algorithm === "greedy-optical/4" ? "continuous" : "guarded";
  if (i.algorithm === "density-feature/16") return "features";
  if (i.params.portrait?.people || i.algorithm === "group-optical/15")
    return "guarded";
  if (
    [
      "density-pin-basis/11",
      "density-resolved/12",
      "density-head/13",
      "hair-cycles/14",
    ].includes(i.algorithm)
  )
    return "basis";
  if (i.algorithm === "density-anatomy/10") return "anatomy";
  if (i.algorithm === "density-physical/8") return "physical";
  if (
    i.algorithm === "density-multiscale/7" ||
    i.algorithm === "continuous-guarded/6"
  )
    return "multiscale";
  return "global";
}
