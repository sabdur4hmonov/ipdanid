// Separate manual anatomical objective; target, materials, crop and prior guides stay unchanged.
import { DEFAULT_ANATOMICAL_IMPORTANCE } from "../src/core/anatomical-importance";
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
const out = "output/anatomy";
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
for (const prioritized of [false, true]) {
  const edgeWeight = 2;
  const name = prioritized ? "nose-lip" : "control",
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
    if (
      JSON.stringify(retained.params.optimization?.anatomy) !==
      JSON.stringify(prioritized ? DEFAULT_ANATOMICAL_IMPORTANCE : undefined)
    )
      throw Error("Objective drift");
    continue;
  }
  if (!prioritized) {
    const retained = JSON.parse(
      readFileSync("output/contour/weight-2.json", "utf8"),
    );
    const i = await validateInstruction(retained.project.instruction);
    if (
      i.imageHash !== seed.imageHash ||
      i.params.parentSequenceHash !== seed.sequenceHash ||
      i.params.optimization?.edgeWeight !== 2 ||
      i.params.optimization.sweeps !== 2 ||
      i.params.optimization.anatomy !== undefined ||
      JSON.stringify(i.profile) !== JSON.stringify(seed.profile) ||
      JSON.stringify(i.params.portrait) !== JSON.stringify(seed.params.portrait)
    )
      throw Error("Control drift");
    const replay = rasterSequence(i),
      sealed = readFileSync("output/contour/weight-2.f32");
    if (!Buffer.from(replay.buffer).equals(sealed))
      throw Error("Control raster drift");
    writeFileSync(
      file,
      JSON.stringify(
        {
          ...retained,
          evidence: { ...retained.evidence, reusedEqualBudgetControl: true },
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    writeFileSync(`${out}/${name}.f32`, sealed, { flag: "wx" });
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
      anatomy: DEFAULT_ANATOMICAL_IMPORTANCE,
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
    anatomy: DEFAULT_ANATOMICAL_IMPORTANCE,
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
    name: "Separate manual nose and lip priority",
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
