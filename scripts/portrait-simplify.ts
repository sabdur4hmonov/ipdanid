import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import {
  simplifySequence,
  assemblyEffort,
  SIMPLIFICATION_TOLERANCES,
} from "../src/core/simplify";
import { validateInstruction } from "../src/core/validation";
import {hash} from '../src/core/engine';
import {
  rasterSequence,
  rasterSequenceAtResolution,
} from "../src/core/optical";
const f = "output/contrast",
  path = f + "/simplified.json";
mkdirSync(f, { recursive: true });
const data = JSON.parse(readFileSync(f + "/physical-2.json", "utf8")),
  source = await validateInstruction(data.instruction),
  target = new Uint8Array(readFileSync("output/resolution/target.bin"));
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
});
if (!existsSync(path)) {
  console.log("Predeclared conservative tolerances", SIMPLIFICATION_TOLERANCES);
  const started = performance.now(),
    samples: ReturnType<typeof process.memoryUsage>[] = [];
  const sample = () => samples.push(process.memoryUsage());
  sample();
  const timer = setInterval(sample, 250);
  let last = 0;
  try {
    const instruction = await simplifySequence(source, target, {
      maxProposals: 512,
      cancelled: () => cancelled,
      onProgress: (d) => {
        if (performance.now() - last > 10000) {
          console.log(d);
          last = performance.now();
        }
      },
      onAccepted: (i) => {
        const p =
          f + `/prune-accepted-${i.params.simplification!.accepted}.json`;
        if (!existsSync(p))
          writeFileSync(
            p,
            JSON.stringify({ instruction: i, transferredProgress: 0 }),
            { flag: "wx" },
          );
      },
    });
    sample();
    writeFileSync(
      path,
      JSON.stringify(
        {
          instruction,
          durationMs: performance.now() - started,
          sourceHash: data.sourceHash,
          edits: data.edits,
          transferredProgress: 0,
          referenceEffort: assemblyEffort(source),
          simplifiedEffort: assemblyEffort(instruction),
          memory: {
            sampleIntervalMs: 250,
            peak: Object.fromEntries(
              Object.keys(samples[0]).map((k) => [
                k,
                Math.max(...samples.map((m) => m[k as keyof typeof m])),
              ]),
            ),
            reference: "Sampled local Node process maxima, not device memory",
          },
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
  } finally {
    clearInterval(timer);
  }
}
const record = JSON.parse(readFileSync(path, "utf8")),
  i = await validateInstruction(record.instruction);
if(await hash(target)!==source.imageHash||i.algorithm!=='assembly-prune/9'||i.params.parentSequenceHash!==source.sequenceHash||i.imageHash!==source.imageHash||i.params.resolution!==source.params.resolution||JSON.stringify(i.profile)!==JSON.stringify(source.profile)||JSON.stringify(i.params.portrait)!==JSON.stringify(source.params.portrait)||record.transferredProgress!==0)throw Error('Completed simplification controls mismatch');
for (const [suffix, raster] of [
  ["", rasterSequence(i)],
  ["-common", rasterSequenceAtResolution(i, 192)],
] as const) {
  const p = f + `/simplified${suffix}.f32`;
  if (existsSync(p)) {
    if (!readFileSync(p).equals(Buffer.from(raster.buffer)))
      throw Error("Preserved raster mismatch");
  } else writeFileSync(p, new Uint8Array(raster.buffer), { flag: "wx" });
}
console.log(
  i.sequenceHash,
  i.params.simplification,
  record.referenceEffort,
  record.simplifiedEffort,
);
