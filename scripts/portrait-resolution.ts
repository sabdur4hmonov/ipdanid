// Reproducible local-only experiment. Immutable completed stages are never overwritten.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { generate, hash } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
import { regionMeasurements } from "../src/core/portrait";
import type { Instruction } from "../src/core/types";

const folder = "output/resolution";
mkdirSync(folder, { recursive: true });
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const audit = json("output/resolution/target-audit.json");
const unrotated = await validateInstruction(
  json("output/guarded/multiscale-2.json").instruction,
);
const unrotatedProfile = structuredClone(unrotated.profile);
const pixels = new Uint8Array(readFileSync("output/resolution/target.bin"));
if (
  audit.reproduced160TargetHash !== unrotated.imageHash ||
  (await hash(pixels)) !== audit.targetHash ||
  (await hash(
    new Uint8Array(
      readFileSync("C:/Users/user/OneDrive/Pictures/rasm for ip.jpg"),
    ),
  )) !== audit.sourceHash
)
  throw new Error("Exact local source/target mismatch");
const options = {
  pixels,
  resolution: 192,
  profile: unrotatedProfile,
  lines: unrotated.params.requestedLines,
  mode: unrotated.params.mode,
  portrait: audit.portrait,
  guarded: true,
};
let last = 0;
const progress = (fraction: number) => {
  if (performance.now() - last > 15000) {
    console.log(Math.round(fraction * 100) + "%");
    last = performance.now();
  }
};
const instructions: Record<string, Instruction> = { unrotated };
for (const name of ["basis", "basis-refined", "multiscale-2"]) {
  const path = `${folder}/${name}.json`;
  if (existsSync(path))
    instructions[name] = await validateInstruction(json(path).instruction);
  else {
    const started = performance.now();
    const seed =
      name === "basis"
        ? undefined
        : instructions[name === "basis-refined" ? "basis" : "basis-refined"];
    const memorySamples: ReturnType<typeof process.memoryUsage>[] = [];
    const sampleMemory = () => memorySamples.push(process.memoryUsage());
    sampleMemory();
    const timer = setInterval(sampleMemory, 250);
    try {
      const instruction = name.startsWith("multiscale")
        ? await generateDensity(
            { ...options, seed, onProgress: progress },
            {
              edgeWeight: name.endsWith("2") ? 2 : 1,
              sweeps: 8,
              multiscale: true,
            },
          )
        : await generate({ ...options, seed, onProgress: progress });
      clearInterval(timer);
      sampleMemory();
      await validateInstruction(instruction);
      instructions[name] = instruction;
      writeFileSync(
        path,
        JSON.stringify(
          {
            instruction,
            durationMs: performance.now() - started,
            sourceHash: audit.sourceHash,
            edits: audit.edits,
            transferredProgress: 0,
            memory: {
              sampleIntervalMs: 250,
              samples: memorySamples.length,
              peak: Object.fromEntries(
                Object.keys(memorySamples[0]).map((k) => [
                  k,
                  Math.max(...memorySamples.map((m) => m[k as keyof typeof m])),
                ]),
              ),
              start: memorySamples[0],
              end: memorySamples.at(-1),
              reference:
                "Node process sampled memory; includes all resident prior stages, excludes OS/browser; not device memory",
            },
          },
          null,
          2,
        ),
        { flag: "wx" },
      );
    } catch (error) {
      clearInterval(timer);
      const failure = `${folder}/${name}-failure.json`;
      if (!existsSync(failure))
        writeFileSync(
          failure,
          JSON.stringify(
            { error: String(error), durationMs: performance.now() - started },
            null,
            2,
          ),
          { flag: "wx" },
        );
      throw error;
    }
  }
  const i = instructions[name];
  if (
    i.imageHash !== audit.targetHash ||
    i.params.resolution !== 192 ||
    i.params.requestedLines !== unrotated.params.requestedLines ||
    i.params.mode !== unrotated.params.mode ||
    i.algorithm !==
      (name === "multiscale-2"
        ? "density-multiscale/7"
        : "continuous-guarded/6") ||
    (name === "basis"
      ? Boolean(i.params.parentSequenceHash)
      : i.params.parentSequenceHash !==
        instructions[name === "basis-refined" ? "basis" : "basis-refined"]
          .sequenceHash) ||
    (name === "multiscale-2" &&
      (i.params.optimization?.edgeWeight !== 2 ||
        i.params.optimization.sweeps !== 8)) ||
    JSON.stringify(i.profile) !== JSON.stringify(unrotatedProfile) ||
    JSON.stringify(i.params.portrait) !== JSON.stringify(audit.portrait)
  )
    throw new Error("Resumed stage has different settings");
  console.log(name, i.sequenceHash, i.metrics.lines, i.metrics.estimatedMeters);
}
const measurements: Record<string, unknown> = {};
for (const [name, i] of Object.entries(instructions)) {
  const raster = rasterSequence(i);
  if (
    existsSync(`${folder}/${name}.f32`) &&
    !readFileSync(`${folder}/${name}.f32`).equals(Buffer.from(raster.buffer))
  )
    throw new Error("Preserved native raster differs from its immutable path");
  if (!existsSync(`${folder}/${name}.f32`))
    writeFileSync(`${folder}/${name}.f32`, new Uint8Array(raster.buffer), {
      flag: "wx",
    });
  measurements[name] = {
    sequenceHash: i.sequenceHash,
    params: i.params,
    algorithm: i.algorithm,
    metrics: i.metrics,
    correctedRegions: regionMeasurements(
      i.params.resolution === 192
        ? pixels
        : new Uint8Array(readFileSync("output/regions/target.bin")),
      raster,
      i.params.resolution,
      i.profile,
      audit.portrait,
    ),
  };
}
if (!existsSync(`${folder}/experiment.json`))
  writeFileSync(
    `${folder}/experiment.json`,
    JSON.stringify(
      {
        sourceHash: audit.sourceHash,
        targetHash: audit.targetHash,
        portrait: audit.portrait,
        edits: audit.edits,
        profile: unrotatedProfile,
        measurements,
        controls: {
          changed:
            "native computation 160 to 192; direct original preprocessing; unchanged fixed-pixel objectives have disclosed spatial confounds",
          resolution: 192,
          radiusMm: 192,
          unrotatedSequenceHash: unrotated.sequenceHash,
        },
        qualityAccepted: false,
        physicallyValidated: false,
        uploaded: false,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
