import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { strict as assert } from "node:assert";
import {
  refineHairCycles,
  type HairCycleCheckpoint,
} from "../src/core/hair-cycles";
import { rasterSequence } from "../src/core/optical";
import { Distribution } from "../src/core/distribution";
import { validateInstruction, progressFor } from "../src/core/validation";

const folder = "output/test-readiness";
mkdirSync(folder, { recursive: true });
if (existsSync(folder + "/hair-recovery-after.json"))
  throw Error("Preserve completed recovery verification");
const root = await validateInstruction(
  JSON.parse(readFileSync("output/portrait-resolved/candidate.json", "utf8"))
    .project.instruction,
);
const expected = await validateInstruction(
  JSON.parse(readFileSync("output/head-quality/cycles.json", "utf8")).project
    .instruction,
);
const head = JSON.parse(
  readFileSync("output/head-quality/manual-regions.json", "utf8"),
).selection;
const pixels = new Uint8Array(
  readFileSync("output/portrait-resolved/target-320.bin"),
);
let stopped = false,
  checkpoint: HairCycleCheckpoint | undefined,
  peakRss = process.memoryUsage().rss;
const start = performance.now();
const progress = (d: Record<string, unknown>) => {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  console.log(JSON.stringify(d));
};
try {
  await refineHairCycles(root, pixels, head, {
    cancelled: () => stopped,
    onProgress: progress,
    onCheckpoint: (s) => {
      checkpoint = s;
      if (s.cycles.length === 16) {
        writeFileSync(folder + "/hair-16-state.json", JSON.stringify(s), {
          flag: "wx",
        });
        stopped = true;
      }
    },
  });
  throw Error("Cancellation was not observed");
} catch (e) {
  assert.equal((e as Error).name, "AbortError");
}
assert(checkpoint && checkpoint.cycles.length === 16);
const interruptedMs = performance.now() - start;
const final = await refineHairCycles(root, pixels, head, {
  resume: checkpoint,
  onProgress: progress,
  onCheckpoint: (s) => {
    writeFileSync(folder + "/hair-latest-state.json", JSON.stringify(s));
  },
});
assert.equal(
  final.sequenceHash,
  expected.sequenceHash,
  "Resumed guide differs from preserved uninterrupted result",
);
assert.deepEqual(final.segments, expected.segments);
assert.deepEqual(rasterSequence(final), rasterSequence(expected));
assert.equal(
  final.metrics.hairCycles!.evaluations,
  expected.metrics.hairCycles!.evaluations,
);
assert.equal(final.metrics.estimatedMeters, expected.metrics.estimatedMeters);
assert.equal(final.params.hairCycles!.referenceHash, root.sequenceHash);
assert.equal(progressFor(final).confirmed, 0);
const d = new Distribution(final.profile.pins.length, final.segments);
writeFileSync(
  folder + "/hair-recovery-after.json",
  JSON.stringify(
    {
      root: root.sequenceHash,
      hash: final.sequenceHash,
      checkpointCycles: checkpoint.cycles.length,
      checkpointEvaluations: checkpoint.evaluations,
      totalCycles: final.metrics.hairCycles!.cycles.length,
      totalEvaluations: final.metrics.hairCycles!.evaluations,
      connections: final.metrics.lines,
      meters: final.metrics.estimatedMeters,
      maxChord: Math.max(...d.pairs.values()),
      maxIncident: Math.max(...d.degree),
      interruptedMs,
      totalWallMs: performance.now() - start,
      optimizerDurationIncludingRecoveryMs: final.metrics.durationMs,
      sampledPeakRss: peakRss,
      cancelled: true,
      replayedPixelsExact: true,
      zeroProgress: true,
      physicalValidation: false,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log("RECOVERY EXACT", final.sequenceHash);
