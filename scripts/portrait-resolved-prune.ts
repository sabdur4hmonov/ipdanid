import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  simplifySequence,
  qualityDifferences,
  withinQualityTolerance,
  assemblyEffort,
} from "../src/core/simplify";
import {
  validateInstruction,
  parseProjectFile,
  progressFor,
} from "../src/core/validation";
import {
  rasterSequence,
  rasterSequenceAtResolution,
} from "../src/core/optical";
import { hash } from "../src/core/engine";
const folder = "output/portrait-resolved",
  file = JSON.parse(readFileSync(folder + "/candidate.json", "utf8")),
  i = await validateInstruction(file.project.instruction),
  pixels = new Uint8Array(readFileSync(folder + "/target-320.bin"));
if (existsSync(folder + "/candidate-pruned.json"))
  throw Error("Preserve completed simplification");
if ((await hash(pixels)) !== i.imageHash) throw Error("Wrong exact target");
let cancelled = false;
process.on("SIGINT", () => (cancelled = true));
const started = performance.now();
const candidate = await simplifySequence(i, pixels, {
  maxProposals: 128,
  cancelled: () => cancelled,
  onProgress: (d) => console.log(JSON.stringify(d)),
});
await validateInstruction(candidate);
const project = {
  ...file.project,
  id: crypto.randomUUID(),
  name: "Separate 320 guide / bounded 128-proposal simplification",
  instruction: candidate,
  progress: progressFor(candidate),
};
await parseProjectFile(JSON.stringify({ schema: "iprasm.project/1", project }));
writeFileSync(
  folder + "/candidate-pruned.json",
  JSON.stringify(
    {
      schema: "iprasm.project/1",
      project,
      evidence: {
        parent: i.sequenceHash,
        durationMs: performance.now() - started,
        referenceEffort: assemblyEffort(i, 8),
        candidateEffort: assemblyEffort(candidate, 8),
        nativeDifferences: qualityDifferences(
          rasterSequence(i),
          rasterSequence(candidate),
          pixels,
          320,
          i,
        ),
        qualityAcceptance: "pending common512 and visual review",
        physicalAcceptance: false,
      },
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    hash: candidate.sequenceHash,
    lines: candidate.metrics.lines,
    saved: i.metrics.lines - candidate.metrics.lines,
    meters: candidate.metrics.estimatedMeters,
    durationMs: performance.now() - started,
  }),
);
