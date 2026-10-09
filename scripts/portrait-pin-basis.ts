import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { withPinBasis } from "../src/core/pin-basis";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { validateInstruction, progressFor } from "../src/core/validation";
import { hash } from "../src/core/engine";
import { rasterSequence } from "../src/core/optical";
import { Distribution } from "../src/core/distribution";
const out = "output/pin-basis";
mkdirSync(out, { recursive: true });
const source = JSON.parse(
  readFileSync("output/circle-head-240/circle-guide.json", "utf8"),
).project;
const reference = await validateInstruction(source.instruction),
  pixels = new Uint8Array(
    readFileSync("output/circle-head-240/circle-target.bin"),
  );
if ((await hash(pixels)) !== reference.imageHash)
  throw Error("Source target mismatch");
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
});
for (const count of [240, 320] as const) {
  const name = count === 240 ? "control-240" : "basis-320",
    profile = withPinBasis(reference.profile, count),
    file = `${out}/${name}.json`,
    stateFile = `${out}/${name}-fit.json`;
  if (existsSync(file)) {
    const retained = await validateInstruction(
      JSON.parse(readFileSync(file, "utf8")).project.instruction,
    );
    if (
      retained.imageHash !== reference.imageHash ||
      JSON.stringify(retained.profile) !== JSON.stringify(profile) ||
      JSON.stringify(retained.params.portrait) !==
        JSON.stringify(reference.params.portrait) ||
      retained.params.parentSequenceHash ||
      retained.params.optimization?.sweeps !== 8 ||
      retained.params.optimization.edgeWeight !== 2
    )
      throw Error("Preserved experiment drift");
    continue;
  }
  const started = performance.now();
  let last = 0,
    peak = process.memoryUsage().rss;
  const instruction = await generateDensity(
    {
      pixels,
      profile,
      resolution: 160,
      portrait: reference.params.portrait,
      lines: reference.params.requestedLines,
      mode: reference.params.mode,
      guarded: true,
      cancelled: () => cancelled,
      onProgress: (f) => {
        peak = Math.max(peak, process.memoryUsage().rss);
        if (performance.now() - last > 15000) {
          console.log(name, Math.round(f * 100) + "%");
          last = performance.now();
        }
      },
    },
    {
      edgeWeight: 2,
      sweeps: 8,
      physical: reference.params.optimization!.contrastPhysical,
      resume: existsSync(stateFile)
        ? (JSON.parse(readFileSync(stateFile, "utf8")) as DensityCheckpoint)
        : undefined,
      onCheckpoint: (s) => {
        writeFileSync(stateFile + ".next", JSON.stringify(s));
        renameSync(stateFile + ".next", stateFile);
      },
    },
  );
  await validateInstruction(instruction);
  if (
    instruction.imageHash !== reference.imageHash ||
    JSON.stringify(instruction.params.portrait) !==
      JSON.stringify(reference.params.portrait) ||
    JSON.stringify(instruction.profile) !== JSON.stringify(profile)
  )
    throw Error("Input drift");
  const d = new Distribution(count, instruction.segments),
    raster = rasterSequence(instruction);
  const evidence = {
    count,
    initialState: "empty optical graph, no old seed",
    plannedSweeps: 8,
    completedSweeps: instruction.metrics.densityFit!.sweeps,
    edgeWeight: 2,
    fullStageMs: performance.now() - started,
    sampledPeakRss: peak,
    maxPair: Math.max(...d.pairs.values()),
    maxIncident: Math.max(...d.degree),
    peakFootprintCacheBytes: instruction.metrics.peakCacheBytes,
    targetHash: instruction.imageHash,
    sequenceHash: instruction.sequenceHash,
    connections: instruction.metrics.lines,
    meters: instruction.metrics.estimatedMeters,
    angularMinimumDegrees: profile.pinBasis!.minimumAngularGapDegrees,
    minimumPinGap: profile.minPinGap,
    actualMinimumAngleDegrees: (profile.minPinGap * 360) / count,
    qualityAcceptance: "open",
    physicalAcceptance: false,
  };
  if (
    evidence.maxPair > 32 ||
    evidence.maxIncident > 160 ||
    evidence.peakFootprintCacheBytes! > 32 * 1024 * 1024
  )
    throw Error("Guard violation");
  writeFileSync(
    file,
    JSON.stringify(
      {
        schema: "iprasm.project/1",
        project: {
          ...source,
          id: crypto.randomUUID(),
          name: `Separate ${count}-pin basis`,
          instruction,
          progress: progressFor(instruction),
        },
        evidence,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  writeFileSync(`${out}/${name}.f32`, Buffer.from(raster.buffer), {
    flag: "wx",
  });
  console.log(JSON.stringify(evidence));
}
