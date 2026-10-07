// Separate solver experiment on the sealed fitted heart. Local-only, resumable.
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { generateDensity } from "../src/core/density";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { hash } from "../src/core/engine";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
const f = "output/shape-fit",
  read = (p: string) => JSON.parse(readFileSync(p, "utf8")),
  basis = read(f + "/after.json"),
  seed = await validateInstruction(basis.instruction),
  pixels = new Uint8Array(readFileSync(f + "/after-target.bin")),
  path = f + "/physical.json",
  state = f + "/physical-fit-checkpoint.json";
if ((await hash(pixels)) !== seed.imageHash)
  throw Error("Exact target mismatch");
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
  console.log("Cancel requested; sealed basis and fit checkpoints retained");
});
if (existsSync(path)) {
  await validateInstruction(read(path).instruction);
  console.log("Retained completed physical experiment");
} else {
  const started = performance.now();
  let peak = process.memoryUsage().rss,
    last = 0;
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 250);
  try {
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
        onProgress: (f) => {
          if (performance.now() - last > 15000) {
            console.log(
              "Physical fit/routing",
              Math.round(f * 100) + "%; no ETA",
            );
            last = performance.now();
          }
        },
        onDiagnostic: (d) =>
          console.log(
            JSON.stringify(
              d.stage === "routing" ? { ...d, routingPairs: undefined } : d,
            ),
          ),
      },
      {
        edgeWeight: 2,
        sweeps: 8,
        physical: defaultPhysicalContrast(),
        resume: existsSync(state) ? read(state) : undefined,
        onCheckpoint: (s) => {
          writeFileSync(state + ".next", JSON.stringify(s));
          renameSync(state + ".next", state);
          console.log("Recoverable graph state", s.sweeps, "NOT a guide");
        },
      },
    );
    await validateInstruction(instruction);
    const raster = rasterSequence(instruction);
    writeFileSync(
      path,
      JSON.stringify(
        {
          instruction,
          sourceHash: basis.sourceHash,
          edits: basis.edits,
          transferredProgress: 0,
          wrapperMs: performance.now() - started,
          sampledPeakRss: peak,
          basisCreationMs: basis.wrapperMs,
          completeAttributedMs: performance.now() - started + basis.wrapperMs,
          experiment:
            "separate density-physical/8 weight2 on unchanged fitted crop/materials; every routed strand counted",
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    writeFileSync(
      f + "/physical.f32",
      Buffer.from(raster.buffer, raster.byteOffset, raster.byteLength),
    );
    console.log(instruction.sequenceHash, instruction.metrics);
  } finally {
    clearInterval(timer);
  }
}
