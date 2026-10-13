import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { generateDensity } from "../src/core/density";
import {
  validateInstruction,
  parseProjectFile,
  progressFor,
} from "../src/core/validation";
import { hash } from "../src/core/engine";
const out = "output/head-quality",
  source = JSON.parse(
    readFileSync("output/portrait-resolved/candidate.json", "utf8"),
  ),
  control = await validateInstruction(source.project.instruction),
  audit = JSON.parse(
    readFileSync("output/portrait-resolved/audit.json", "utf8"),
  ),
  pixels = new Uint8Array(
    readFileSync("output/portrait-resolved/target-320.bin"),
  ),
  portrait = audit.rows.find((r: any) => r.n === 320).portrait;
if (existsSync(out + "/candidate.json"))
  throw Error("Preserve completed experiment");
if (
  (await hash(pixels)) !== audit.rows.find((r: any) => r.n === 320).targetHash
)
  throw Error("Target mismatch");
let cancelled = false,
  last = 0,
  peakRss = process.memoryUsage().rss;
process.on("SIGINT", () => (cancelled = true));
const options = {
  pixels,
  profile: control.profile,
  resolution: 320,
  portrait,
  lines: control.params.requestedLines,
  mode: control.params.mode,
  cancelled: () => cancelled || existsSync(out + "/cancel.requested"),
  onProgress: (fraction: number) => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    if (performance.now() - last > 15000) {
      last = performance.now();
      console.log(
        JSON.stringify({
          stage: "head320-fit",
          fraction,
          elapsedMs: performance.now() - start,
          sampledPeakRss: peakRss,
        }),
      );
    }
  },
  onDiagnostic: (d: Record<string, unknown>) => {
    if (["fit", "routing"].includes(String(d.stage)))
      console.log(JSON.stringify(d));
  },
};
const state = out + "/fit.json",
  start = performance.now();
const tuning = {
  resolved: true,
  head: JSON.parse(readFileSync(out + "/manual-regions.json", "utf8"))
    .selection,
  edgeWeight: control.params.optimization!.edgeWeight!,
  sweeps: 8,
  physical: control.params.optimization!.contrastPhysical!,
  resume: existsSync(state)
    ? JSON.parse(readFileSync(state, "utf8"))
    : undefined,
  onCheckpoint: (s: any) => {
    writeFileSync(state + ".next", JSON.stringify(s));
    renameSync(state + ".next", state);
    if (s.sweeps % 2 === 0 && !existsSync(out + `/fit-${s.sweeps}.json`))
      writeFileSync(out + `/fit-${s.sweeps}.json`, JSON.stringify(s), {
        flag: "wx",
      });
  },
};
const i = await generateDensity(options, tuning);
const elapsedMs = performance.now() - start;
async function seal(instruction: any, name: string) {
  await validateInstruction(instruction);
  const file = {
    schema: "iprasm.project/1",
    project: {
      ...source.project,
      id: crypto.randomUUID(),
      name:
        "Experimental whole-head importance / unchanged target and 0.1 mm · " +
        name,
      instruction,
      progress: progressFor(instruction),
    },
    evidence: {
      elapsedMs,
      sampledPeakRss: peakRss,
      physicalAcceptance: false,
      qualityAcceptance: "open",
      targetSource: audit.source,
      preparedSourceHash: audit.preparedSourceHash,
      materialChanged: false,
      cropChanged: false,
      objectiveChanged: "manual-head-importance/1",
      referenceHash: control.sequenceHash,
      timingNote:
        name === "candidate"
          ? "fresh eight-sweep fit and routing wall time"
          : "snapshot core timing is metrics.durationMs; enclosing wall time belongs to eight-sweep run",
    },
  };
  await parseProjectFile(JSON.stringify(file));
  writeFileSync(out + "/" + name + ".json", JSON.stringify(file, null, 2), {
    flag: "wx",
  });
}
await seal(i, "candidate");
if (existsSync(out + "/fit-4.json")) {
  const snapshot = await generateDensity(options, {
    ...tuning,
    resume: JSON.parse(readFileSync(out + "/fit-4.json", "utf8")),
    materializeOnly: true,
    onCheckpoint: undefined,
  });
  await seal(snapshot, "candidate-4");
}
console.log(
  JSON.stringify({
    hash: i.sequenceHash,
    lines: i.metrics.lines,
    meters: i.metrics.estimatedMeters,
    elapsedMs,
    sampledPeakRss: peakRss,
    stop: i.metrics.stoppedReason,
  }),
);
