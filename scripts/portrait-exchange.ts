import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { generateDensity } from "../src/core/density";
import { hash } from "../src/core/engine";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
const f = "output/convergence",
  read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const targeted = process.argv.includes("--targeted");
const selection = targeted
  ? ("nose-lip-residual/1" as const)
  : ("initial-full-objective-gain/1" as const);
const evaluationLimit = targeted ? 25000 : 40000,
  poolSize = targeted ? 256 : 128;
const prior = read(f + "/total-19.json"),
  seed = await validateInstruction(prior.instruction);
const pixels = new Uint8Array(readFileSync("output/resolution/target.bin"));
if (
  seed.sequenceHash !==
    "742274f9b74fed4030e410afb130214347032d29c3cefc1f2b6c66a15f5dbd45" ||
  (await hash(pixels)) !== seed.imageHash
)
  throw Error("Exchange reference/target mismatch");
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
  console.log("Cancellation requested; saved exchange graphs preserved.");
});
for (const mode of ["single", "paired"] as const) {
  const name = "exchange-" + (targeted ? "targeted-" : "") + mode,
    path = f + "/" + name + ".json",
    cpPath = f + "/" + name + "-state.json";
  if (existsSync(path)) {
    const i = await validateInstruction(read(path).instruction);
    if (
      i.params.parentSequenceHash !== seed.sequenceHash ||
      i.params.optimization?.exchange?.mode !== mode ||
      i.params.optimization?.exchange?.selection !== selection ||
      i.params.optimization?.exchange?.evaluationLimit !== evaluationLimit
    )
      throw Error("Sealed search differs");
    console.log("Completed search retained", name, i.sequenceHash);
    continue;
  }
  const started = performance.now(),
    samples: ReturnType<typeof process.memoryUsage>[] = [];
  const sample = () => samples.push(process.memoryUsage());
  sample();
  const timer = setInterval(sample, 250);
  const diagnostics: any[] = [];
  try {
    let routing: any;
    const instruction = await generateDensity(
      {
        pixels,
        profile: seed.profile,
        resolution: seed.params.resolution,
        mode: seed.params.mode,
        portrait: seed.params.portrait,
        lines: seed.params.requestedLines,
        seed,
        cancelled: () => cancelled,
        onDiagnostic: (d) => {
          diagnostics.push({ ...d, elapsedMs: performance.now() - started });
          if (d.stage === "routing") routing = d;
          console.log(JSON.stringify({ ...d, routingPairs: undefined }));
        },
      },
      {
        edgeWeight: 2,
        sweeps: 1,
        physical: seed.params.optimization!.contrastPhysical,
        exchange: {
          version: "chord-exchange/1",
          mode,
          evaluationLimit,
          poolSize,
          selection,
        },
        resume: existsSync(cpPath) ? read(cpPath) : undefined,
        onCheckpoint: (s) => {
          writeFileSync(cpPath + ".next", JSON.stringify(s));
          renameSync(cpPath + ".next", cpPath);
          console.log(
            "Recoverable exchange graph",
            mode,
            s.evaluations,
            `/${evaluationLimit}; not assembly instructions`,
          );
        },
      },
    );
    sample();
    await validateInstruction(instruction);
    const record = {
      instruction,
      sourceHash: prior.sourceHash,
      edits: prior.edits,
      transferredProgress: 0,
      durationMs: performance.now() - started,
      routing,
      diagnostics,
      comparison: {
        version: "equal-gain-budget/1",
        rootSequenceHash: seed.sequenceHash,
        budget: evaluationLimit,
        poolSelection: targeted
          ? `Nose/lip-touching chords ranked by initial local tone residual; fixed ${poolSize}x${poolSize} pool. Acceptance uses unchanged COMPLETE tone + fractional physical contrast objective.`
          : `Same initial add/drop full objective gains; fixed ranked ${poolSize}x${poolSize} pool. Exact full optical gains include fractional physical contrast.`,
        limitation:
          "Search gain calls have equal allowances and include pool construction/infeasible hypotheses; compound calls touch larger pixel unions. Final physical routing is additional work, fully included and separately timed.",
      },
      memory: {
        sampleIntervalMs: 250,
        samples: samples.length,
        peak: Object.fromEntries(
          Object.keys(samples[0]).map((k) => [
            k,
            Math.max(...samples.map((m) => m[k as keyof typeof m])),
          ]),
        ),
        limitation:
          "Sampled host Node process, not instantaneous peak/device memory",
      },
    };
    writeFileSync(path, JSON.stringify(record, null, 2), { flag: "wx" });
    const a = rasterSequence(instruction);
    writeFileSync(f + "/" + name + ".f32", Buffer.from(a.buffer), {
      flag: "wx",
    });
    console.log(
      JSON.stringify({
        name,
        hash: instruction.sequenceHash,
        connections: instruction.metrics.lines,
        thread: instruction.metrics.estimatedMeters,
        fitObjective: routing.fitObjective,
        routedObjective: routing.completeObjective,
        search: instruction.metrics.exchange,
        durationMs: record.durationMs,
        memory: record.memory.peak.rss,
      }),
    );
  } finally {
    clearInterval(timer);
  }
}
