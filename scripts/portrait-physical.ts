// Exact preserved refined192 basis; independent physical objective. Never overwrites completed evidence.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { generateDensity } from "../src/core/density";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { hash } from "../src/core/engine";
import { validateInstruction } from "../src/core/validation";
import {
  rasterSequence,
  rasterSequenceAtResolution,
} from "../src/core/optical";
const f = "output/contrast";
mkdirSync(f, { recursive: true });
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const audit = read("output/resolution/target-audit.json");
const pixels = new Uint8Array(readFileSync("output/resolution/target.bin"));
const seed = await validateInstruction(
  read("output/resolution/basis-refined.json").instruction,
);
if (
  (await hash(pixels)) !== audit.targetHash ||
  seed.imageHash !== audit.targetHash ||
  (await hash(
    new Uint8Array(
      readFileSync("C:/Users/user/OneDrive/Pictures/rasm for ip.jpg"),
    ),
  )) !== audit.sourceHash
)
  throw Error("Original source/target mismatch");
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
  console.log("Cancellation requested; completed immutable stages preserved.");
});
const path = f + "/physical-2.json";
let record;
if (existsSync(path)) record = read(path);
else {
  const started = performance.now(),
    samples: ReturnType<typeof process.memoryUsage>[] = [];
  const sample = () => samples.push(process.memoryUsage());
  sample();
  const timer = setInterval(sample, 250);
  let last = 0;
  try {
    const checkpointPath = f + "/physical-2-fit-checkpoint.json";
    const instruction = await generateDensity(
      {
        pixels,
        resolution: 192,
        profile: seed.profile,
        portrait: seed.params.portrait,
        lines: seed.params.requestedLines,
        mode: seed.params.mode,
        seed,
        cancelled: () => cancelled,
        onProgress: (fraction) => {
          if (performance.now() - last > 15000) {
            console.log("Fit/routing work", Math.round(fraction * 100) + "%");
            last = performance.now();
          }
        },
        onDiagnostic: (d) => {
          console.log(
            JSON.stringify(
              d.stage === "routing" ? { ...d, routingPairs: undefined } : d,
            ),
          );
        },
      },
      {
        edgeWeight: 2,
        sweeps: 8,
        physical: defaultPhysicalContrast(),
        resume: existsSync(checkpointPath) ? read(checkpointPath) : undefined,
        onCheckpoint: (s) => {
          writeFileSync(checkpointPath + ".next", JSON.stringify(s));
          renameSync(checkpointPath + ".next", checkpointPath);
          console.log(
            "Recoverable fit checkpoint",
            s.sweeps,
            "(not assembly instructions)",
          );
        },
      },
    );
    sample();
    await validateInstruction(instruction);
    record = {
      instruction,
      durationMs: performance.now() - started,
      sourceHash: audit.sourceHash,
      edits: audit.edits,
      transferredProgress: 0,
      memory: {
        sampleIntervalMs: 250,
        samples: samples.length,
        peak: Object.fromEntries(
          Object.keys(samples[0]).map((k) => [
            k,
            Math.max(...samples.map((m) => m[k as keyof typeof m])),
          ]),
        ),
        reference:
          "Sampled Node process maxima, not guaranteed instantaneous peak; not Android memory",
      },
      basisCreationMs: read("output/resolution/basis.json").instruction.metrics
        .durationMs,
      basisRefinementMs: read("output/resolution/basis-refined.json")
        .instruction.metrics.durationMs,
    };
    writeFileSync(path, JSON.stringify(record, null, 2), { flag: "wx" });
  } finally {
    clearInterval(timer);
  }
}
const i = await validateInstruction(record.instruction);
if (
  i.algorithm !== "density-physical/8" ||
  i.params.parentSequenceHash !== seed.sequenceHash ||
  i.params.resolution !== 192 ||
  i.params.mode !== seed.params.mode ||
  i.params.requestedLines !== seed.params.requestedLines ||
  i.params.optimization?.edgeWeight !== 2 ||
  i.params.optimization?.sweeps !== 8 ||
  record.sourceHash !== audit.sourceHash ||
  record.transferredProgress !== 0 ||
  i.imageHash !== audit.targetHash ||
  JSON.stringify(i.profile) !== JSON.stringify(seed.profile) ||
  JSON.stringify(i.params.portrait) !== JSON.stringify(seed.params.portrait) ||
  JSON.stringify(i.params.optimization?.contrastPhysical) !==
    JSON.stringify(defaultPhysicalContrast())
)
  throw Error("Checkpoint settings mismatch");
for (const [name, guide] of [
  ["physical-2", i],
  [
    "pixel-192",
    await validateInstruction(
      read("output/resolution/multiscale-2.json").instruction,
    ),
  ],
  [
    "pixel-160",
    await validateInstruction(
      read("output/guarded/multiscale-2.json").instruction,
    ),
  ],
] as const)
  for (const [suffix, raster] of [
    ["", rasterSequence(guide)],
    ["-common", rasterSequenceAtResolution(guide, 192)],
  ] as const) {
    const dst = `${f}/${name}${suffix}.f32`,
      buffer = Buffer.from(raster.buffer);
    if (existsSync(dst)) {
      if (!readFileSync(dst).equals(buffer))
        throw Error("Immutable raster differs");
    } else writeFileSync(dst, buffer, { flag: "wx" });
  }
console.log("Completed", i.sequenceHash, i.metrics);
