import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { generate } from "../src/core/engine";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
const folder = "output/shape-fit",
  audit = JSON.parse(readFileSync(folder + "/audit.json", "utf8"));
let cancelled = false;
process.on("SIGINT", () => {
  cancelled = true;
});
for (const name of ["before", "after"]) {
  const path = folder + "/" + name + ".json";
  if (existsSync(path)) {
    await validateInstruction(
      JSON.parse(readFileSync(path, "utf8")).instruction,
    );
    console.log("Retained", name);
    continue;
  }
  const s = audit.stages[name],
    started = performance.now();
  let last = 0,
    peak = process.memoryUsage().rss;
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 250);
  try {
    const instruction = await generate({
      pixels: new Uint8Array(readFileSync(folder + "/" + name + "-target.bin")),
      profile: audit.profile,
      resolution: audit.resolution,
      mode: "dark",
      lines: 20000,
      portrait: s.portrait,
      guarded: true,
      cancelled: () => cancelled,
      onProgress: (f) => {
        if (performance.now() - last > 15000) {
          console.log(name, Math.round(f * 100) + "%; no ETA");
          last = performance.now();
        }
      },
    });
    await validateInstruction(instruction);
    const a = rasterSequence(instruction);
    writeFileSync(
      path,
      JSON.stringify(
        {
          instruction,
          sourceHash: audit.sourceHash,
          edits: s.edits,
          transferredProgress: 0,
          wrapperMs: performance.now() - started,
          sampledPeakRss: peak,
          preprocessingExperiment:
            "marked-face-shape-fit/1; not optimizer change; screenshot settings unknown",
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    writeFileSync(
      folder + "/" + name + ".f32",
      Buffer.from(a.buffer, a.byteOffset, a.byteLength),
    );
    console.log(
      name,
      instruction.sequenceHash,
      instruction.metrics.lines,
      instruction.metrics.estimatedMeters,
      instruction.metrics.stoppedReason,
      performance.now() - started,
    );
  } finally {
    clearInterval(timer);
  }
}
