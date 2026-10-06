import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { hash } from "../src/core/engine";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
const folder = "output/convergence";
mkdirSync(folder, { recursive: true });
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const rootRecord = read("output/contrast/physical-2.json");
const reference = await validateInstruction(rootRecord.instruction);
const seed = await validateInstruction(
  read("output/resolution/basis-refined.json").instruction,
);
const original: DensityCheckpoint = read(
  "output/contrast/physical-2-fit-checkpoint.json",
);
const pixels = new Uint8Array(readFileSync("output/resolution/target.bin"));
const audit = read("output/resolution/target-audit.json");
if (
  reference.sequenceHash !==
    "63d9e9dbc30739f32c55d00ad2ee11dfdc97459b1b5eda3d3cbc5f68b6a5471e" ||
  (await hash(pixels)) !== reference.imageHash ||
  (await hash(
    new Uint8Array(
      readFileSync("C:/Users/user/OneDrive/Pictures/rasm for ip.jpg"),
    ),
  )) !== audit.sourceHash
)
  throw Error("Immutable source/reference identity mismatch");
const options = {
  pixels,
  resolution: 192,
  profile: seed.profile,
  portrait: seed.params.portrait,
  lines: seed.params.requestedLines,
  mode: seed.params.mode,
  seed,
};
const tuning = {
  edgeWeight: reference.params.optimization!.edgeWeight!,
  sweeps: 24,
  physical: reference.params.optimization!.contrastPhysical!,
  extension: { checkpoint: original, priorSweepLimit: 8, reference },
};
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
  console.log(
    "Cancellation requested; completed states and buildable snapshots preserved.",
  );
});
const resumePath = folder + "/fit-latest.json",
  log: any[] = existsSync(folder + "/diagnostics.json")
    ? read(folder + "/diagnostics.json")
    : [];
const started = performance.now(),
  samples: ReturnType<typeof process.memoryUsage>[] = [];
const sample = () => samples.push(process.memoryUsage());
sample();
const timer = setInterval(sample, 250);
const memory = () => ({
  sampleIntervalMs: 250,
  samples: samples.length,
  peak: Object.fromEntries(
    Object.keys(samples[0]).map((k) => [
      k,
      Math.max(...samples.map((m) => m[k as keyof typeof m])),
    ]),
  ),
  limitation:
    "Sampled host Node process; not instantaneous peak or Android memory",
});
const save = async (name: string, instruction: any, routing: any) => {
  await validateInstruction(instruction);
  const path = folder + "/" + name + ".json";
  const record = {
    instruction,
    sourceHash: audit.sourceHash,
    edits: audit.edits,
    transferredProgress: 0,
    priorSweeps: 8,
    additionalSweeps: instruction.metrics.densityFit.sweeps - 8,
    totalSweeps: instruction.metrics.densityFit.sweeps,
    priorGenerationMs: rootRecord.instruction.metrics.durationMs,
    basisCreationMs: rootRecord.basisCreationMs,
    basisRefinementMs: rootRecord.basisRefinementMs,
    additionalWallMs: performance.now() - started,
    totalAttributedPipelineMs:
      rootRecord.basisCreationMs +
      rootRecord.basisRefinementMs +
      rootRecord.instruction.metrics.durationMs +
      performance.now() -
      started,
    memory: memory(),
    routing,
    checkpointKind:
      "complete executable snapshot, including all routing; zero progress",
  };
  if (!existsSync(path))
    writeFileSync(path, JSON.stringify(record, null, 2), { flag: "wx" });
  else if (read(path).instruction.sequenceHash !== instruction.sequenceHash)
    throw Error("Sealed convergence guide differs");
  const a = rasterSequence(instruction),
    dst = folder + "/" + name + ".f32",
    b = Buffer.from(a.buffer);
  if (existsSync(dst)) {
    if (!readFileSync(dst).equals(b)) throw Error("Sealed raster differs");
  } else writeFileSync(dst, b, { flag: "wx" });
  console.log(
    JSON.stringify({
      snapshot: name,
      hash: instruction.sequenceHash,
      totalSweeps: record.totalSweeps,
      additionalSweeps: record.additionalSweeps,
      connections: instruction.metrics.lines,
      routing: instruction.metrics.densityFit.routingConnections,
      meters: instruction.metrics.estimatedMeters,
      fitObjective: routing?.fitObjective,
      finalRoutedObjective: routing?.completeObjective,
      additionalWallMs: record.additionalWallMs,
      memory: record.memory.peak.rss,
    }),
  );
};
try {
  if (existsSync(folder + "/completion.json")) {
    const i = await validateInstruction(
      read(folder + "/" + read(folder + "/completion.json").name + ".json")
        .instruction,
    );
    if (
      i.params.optimization?.convergence?.rootSequenceHash !==
        reference.sequenceHash ||
      i.imageHash !== reference.imageHash ||
      JSON.stringify(i.profile) !== JSON.stringify(reference.profile)
    )
      throw Error("Completed stage incompatible");
    console.log("Completed stage retained", i.sequenceHash);
    process.exitCode = 0;
  } else {
    let finalRouting: any,
      last = 0;
    const instruction = await generateDensity(
      {
        ...options,
        cancelled: () => cancelled,
        onProgress: (f) => {
          if (performance.now() - last > 15000) {
            console.log("Bounded fit work", Math.round(f * 100) + "%; no ETA");
            last = performance.now();
          }
        },
        onDiagnostic: (d) => {
          log.push({ ...d, additionalWallMs: performance.now() - started });
          writeFileSync(
            folder + "/diagnostics.json",
            JSON.stringify(log, null, 2),
          );
          if (d.stage === "routing") finalRouting = d;
          console.log(JSON.stringify({ ...d, routingPairs: undefined }));
        },
      },
      {
        ...tuning,
        resume: existsSync(resumePath) ? read(resumePath) : undefined,
        onCheckpoint: async (s) => {
          const archive = folder + "/fit-total-" + s.sweeps + ".json";
          if (existsSync(archive)) {
            if (read(archive).checksum !== s.checksum)
              throw Error("Immutable fit state differs");
          } else writeFileSync(archive, JSON.stringify(s), { flag: "wx" });
          writeFileSync(resumePath + ".next", JSON.stringify(s));
          renameSync(resumePath + ".next", resumePath);
          console.log(
            "Recoverable saved graph",
            s.sweeps,
            "total; NOT an assembly guide",
          );
          if (s.sweeps % 4 === 0 && s.sweeps < 24) {
            let routing: any;
            const guide = await generateDensity(
              {
                ...options,
                cancelled: () => cancelled,
                onDiagnostic: (d) => {
                  if (d.stage === "routing") routing = d;
                },
              },
              { ...tuning, resume: s, materializeOnly: true },
            );
            await save("total-" + s.sweeps, guide, routing);
          }
        },
      },
    );
    sample();
    const name = "total-" + instruction.metrics.densityFit!.sweeps;
    await save(name, instruction, finalRouting);
    writeFileSync(
      folder + "/completion.json",
      JSON.stringify({
        name,
        sequenceHash: instruction.sequenceHash,
        priorSweeps: 8,
        additionalSweeps: instruction.metrics.densityFit!.sweeps - 8,
        totalSweeps: instruction.metrics.densityFit!.sweeps,
        allowance: 24,
      }),
      { flag: "wx" },
    );
  }
} finally {
  clearInterval(timer);
}
