import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { refineHairCycles } from "../src/core/hair-cycles";
import {
  validateInstruction,
  progressFor,
  parseProjectFile,
} from "../src/core/validation";
const f = "output/head-quality",
  ref = JSON.parse(
    readFileSync("output/portrait-resolved/candidate.json", "utf8"),
  ),
  seed = await validateInstruction(ref.project.instruction),
  pixels = new Uint8Array(
    readFileSync("output/portrait-resolved/target-320.bin"),
  ),
  head = JSON.parse(readFileSync(f + "/manual-regions.json", "utf8")).selection;
if (existsSync(f + "/cycles.json")) throw Error("Preserve completed trial");
let cancelled = false,
  peakRss = process.memoryUsage().rss;
process.on("SIGINT", () => (cancelled = true));
const start = performance.now();
async function seal(i: any, name: string) {
  const payload = {
    schema: ref.schema,
    project: {
      ...ref.project,
      id: crypto.randomUUID(),
      name: "Face-preserved hair cycles / unchanged 0.1 mm",
      instruction: i,
      progress: progressFor(i),
    },
    evidence: {
      elapsedMs: performance.now() - start,
      sampledPeakRss: peakRss,
      qualityAcceptance: "open",
      physicalAcceptance: false,
      referenceHash: seed.sequenceHash,
    },
  };
  await parseProjectFile(JSON.stringify(payload));
  writeFileSync(f + `/${name}.json`, JSON.stringify(payload, null, 2), {
    flag: "wx",
  });
}
const i = await refineHairCycles(seed, pixels, head, {
  cancelled: () => cancelled || existsSync(f + "/cancel.requested"),
  onProgress: (d) => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    console.log(JSON.stringify({ ...d, sampledPeakRss: peakRss }));
  },
  onAccepted: (i) => seal(i, `cycle-${i.metrics.hairCycles!.cycles.length}`),
});
await seal(i, "cycles");
console.log(
  JSON.stringify({
    hash: i.sequenceHash,
    lines: i.metrics.lines,
    meters: i.metrics.estimatedMeters,
    stop: i.metrics.stoppedReason,
    elapsedMs: performance.now() - start,
    peakRss,
  }),
);
