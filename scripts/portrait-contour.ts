// Paired objective experiment, not a new default or an assembly acceptance.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { validateInstruction, progressFor } from "../src/core/validation";
import { hash } from "../src/core/engine";
import { rasterSequence } from "../src/core/optical";
import { Distribution } from "../src/core/distribution";
import { regionMeasurements } from "../src/core/portrait";
const out = "output/contour";
mkdirSync(out, { recursive: true });
const source = JSON.parse(
  readFileSync("output/circle-head-240/circle-guide.json", "utf8"),
).project;
const seed = await validateInstruction(source.instruction);
const pixels = new Uint8Array(
  readFileSync("output/circle-head-240/circle-target.bin"),
);
if ((await hash(pixels)) !== seed.imageHash)
  throw Error("Exact target mismatch");
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
});
for (const edgeWeight of [2, 4]) {
  const name = `weight-${edgeWeight}`,
    file = `${out}/${name}.json`,
    stateFile = `${out}/${name}-fit.json`;
  if (existsSync(file)) {
    const retained = await validateInstruction(
      JSON.parse(readFileSync(file, "utf8")).project.instruction,
    );
    if (
      retained.imageHash !== seed.imageHash ||
      retained.params.parentSequenceHash !== seed.sequenceHash ||
      retained.params.optimization?.edgeWeight !== edgeWeight ||
      retained.params.optimization?.sweeps !== 2 ||
      JSON.stringify(retained.profile) !== JSON.stringify(seed.profile) ||
      JSON.stringify(retained.params.portrait) !==
        JSON.stringify(seed.params.portrait)
    )
      throw Error(
        "Preserved contour experiment does not match current reference",
      );
    continue;
  }
  const started = performance.now();
  let last = 0,
    peak = process.memoryUsage().rss;
  const instruction = await generateDensity(
    {
      pixels,
      resolution: seed.params.resolution,
      profile: seed.profile,
      portrait: seed.params.portrait,
      lines: seed.params.requestedLines,
      mode: seed.params.mode,
      seed,
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
      edgeWeight,
      sweeps: 2,
      physical: seed.params.optimization!.contrastPhysical,
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
    instruction.imageHash !== seed.imageHash ||
    JSON.stringify(instruction.profile) !== JSON.stringify(seed.profile) ||
    JSON.stringify(instruction.params.portrait) !==
      JSON.stringify(seed.params.portrait)
  )
    throw Error("Experiment input drift");
  const distribution = new Distribution(
    instruction.profile.pins.length,
    instruction.segments,
  );
  if (
    Math.max(...distribution.pairs.values()) > 32 ||
    Math.max(...distribution.degree) > 160
  )
    throw Error("Winding guard violation");
  const raster = rasterSequence(instruction);
  const evidence = {
    fullStageMs: performance.now() - started,
    sampledPeakRss: peak,
    edgeWeight,
    sweeps: 2,
    referenceHash: seed.sequenceHash,
    sequenceHash: instruction.sequenceHash,
    targetHash: instruction.imageHash,
    connections: instruction.metrics.lines,
    meters: instruction.metrics.estimatedMeters,
    maxPair: Math.max(...distribution.pairs.values()),
    maxIncident: Math.max(...distribution.degree),
    native: regionMeasurements(
      pixels,
      raster,
      seed.params.resolution,
      seed.profile,
      seed.params.portrait!,
    ),
    qualityAcceptance: "open",
    physicalAcceptance: false,
  };
  const project = {
    ...source,
    id: crypto.randomUUID(),
    name: `Separate contour experiment / weight ${edgeWeight}`,
    instruction,
    progress: progressFor(instruction),
  };
  writeFileSync(
    file,
    JSON.stringify({ schema: "iprasm.project/1", project, evidence }, null, 2),
    { flag: "wx" },
  );
  writeFileSync(`${out}/${name}.f32`, Buffer.from(raster.buffer), {
    flag: "wx",
  });
  console.log(JSON.stringify(evidence));
}
