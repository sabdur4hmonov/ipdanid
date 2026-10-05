// Reproducible local-only experiment. Immutable completed stages are never overwritten.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { generate, hash } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
import { regionMeasurements } from "../src/core/portrait";
import type { Instruction } from "../src/core/types";
const folder = "output/guarded";
mkdirSync(folder, { recursive: true });
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const audit = json("output/regions/audit.json"),
  old = await validateInstruction(
    json("output/portrait/continued.json").instruction,
  ),
  prior = await validateInstruction(
    json("output/fidelity/distributed-contours.json").instruction,
  );
const pixels = new Uint8Array(readFileSync("output/regions/target.bin"));
if (
  (await hash(pixels)) !== audit.targetHash ||
  old.imageHash !== audit.targetHash ||
  prior.imageHash !== audit.targetHash ||
  (await hash(
    new Uint8Array(
      readFileSync("C:/Users/user/OneDrive/Pictures/rasm for ip.jpg"),
    ),
  )) !== audit.sourceHash
)
  throw new Error("Exact local source/target mismatch");
const options = {
  pixels,
  resolution: 160,
  profile: old.profile,
  lines: old.params.requestedLines,
  mode: old.params.mode,
  portrait: audit.portrait,
  guarded: true,
};
for (const k of ["crop", "target", "corrected-overlay"])
  if (!existsSync(`${folder}/${k}.png`))
    copyFileSync(`output/regions/${k}.png`, `${folder}/${k}.png`);
if (!existsSync(`${folder}/target.bin`))
  copyFileSync("output/regions/target.bin", `${folder}/target.bin`);
let last = 0;
const progress = (fraction: number) => {
  if (performance.now() - last > 15000) {
    console.log(Math.round(fraction * 100) + "%");
    last = performance.now();
  }
};
const instructions: Record<string, Instruction> = { baseline: old, prior };
for (const name of ["basis", "basis-refined", "multiscale-1", "multiscale-2"]) {
  const path = `${folder}/${name}.json`;
  if (existsSync(path))
    instructions[name] = await validateInstruction(json(path).instruction);
  else {
    const started = performance.now();
    const seed =
      name === "basis"
        ? undefined
        : instructions[name === "basis-refined" ? "basis" : "basis-refined"];
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
          },
          null,
          2,
        ),
        { flag: "wx" },
      );
    } catch (error) {
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
    JSON.stringify(i.profile) !== JSON.stringify(old.profile) ||
    JSON.stringify(i.params.portrait) !== JSON.stringify(audit.portrait)
  )
    throw new Error("Resumed stage has different settings");
  console.log(name, i.sequenceHash, i.metrics.lines, i.metrics.estimatedMeters);
}
const measurements: Record<string, unknown> = {};
for (const [name, i] of Object.entries(instructions)) {
  const raster = rasterSequence(i);
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
      pixels,
      raster,
      160,
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
        profile: old.profile,
        measurements,
        qualityAccepted: false,
        physicallyValidated: false,
        uploaded: false,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
