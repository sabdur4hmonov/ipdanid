import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { generateDensity } from "../src/core/density";
import { generate } from "../src/core/engine";
import {
  validateInstruction,
  parseProjectFile,
  progressFor,
} from "../src/core/validation";
import { withPinBasis } from "../src/core/pin-basis";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
const f = "output/portrait-dispatch",
  base = JSON.parse(readFileSync(f + "/owner-baseline.json", "utf8")),
  audit = JSON.parse(readFileSync(f + "/audit.json", "utf8"));
let cancelled = false;
process.on("SIGINT", () => (cancelled = true));
for (const [name, n, solver] of [
  ["guarded120", 160, "guarded"],
  ["physical120", 160, "physical"],
  ["resolved240", 320, "resolved"],
] as const) {
  if (existsSync(`${f}/${name}.json`)) continue;
  let profile = structuredClone(base.project.instruction.profile);
  if (solver === "resolved") {
    profile = withPinBasis(profile, 240, 7.5);
    profile.threadMm = 0.1;
  }
  const portrait = audit.rows.find((r: any) => r.n === n).portrait;
  const pixels = new Uint8Array(readFileSync(`${f}/target-${n}.bin`));
  const start = performance.now();
  let rss = process.memoryUsage().rss,
    last = 0;
  const options = {
    pixels,
    resolution: n,
    profile,
    portrait,
    mode: "dark" as const,
    lines: 20000,
    guarded: true,
    cancelled: () => cancelled,
    onProgress: (fraction: number) => {
      rss = Math.max(rss, process.memoryUsage().rss);
      if (performance.now() - last > 15000) {
        last = performance.now();
        console.log(
          JSON.stringify({
            name,
            fraction,
            elapsedMs: performance.now() - start,
            sampledPeakRss: rss,
          }),
        );
      }
    },
    onDiagnostic: (d: any) => {
      if (["fit", "routing"].includes(d.stage))
        console.log(JSON.stringify({ name, ...d }));
    },
  };
  const state = `${f}/${name}-fit.json`;
  const i =
    solver === "guarded"
      ? await generate(options)
      : await generateDensity(options, {
          edgeWeight: 2,
          sweeps: 8,
          physical: defaultPhysicalContrast(),
          resolved: solver === "resolved",
          resume: existsSync(state)
            ? JSON.parse(readFileSync(state, "utf8"))
            : undefined,
          onCheckpoint: (s) => {
            writeFileSync(state + ".next", JSON.stringify(s));
            renameSync(state + ".next", state);
          },
        });
  await validateInstruction(i);
  const file = {
    schema: "iprasm.project/1",
    project: {
      ...base.project,
      id: crypto.randomUUID(),
      name: `Portrait dispatch / ${name}`,
      instruction: i,
      progress: progressFor(i),
    },
    evidence: {
      elapsedMs: performance.now() - start,
      sampledPeakRss: rss,
      source: audit.sourceSha,
      physicalAcceptance: false,
      qualityAcceptance: "open",
      materialChanged: solver === "resolved",
      preprocessing:
        "Grayscale-only target from same exact current crop; no enhancement or background blur",
      fresh: true,
    },
  };
  await parseProjectFile(JSON.stringify(file));
  writeFileSync(`${f}/${name}.json`, JSON.stringify(file, null, 2), {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      name,
      hash: i.sequenceHash,
      lines: i.metrics.lines,
      meters: i.metrics.estimatedMeters,
      elapsedMs: file.evidence.elapsedMs,
      stop: i.metrics.stoppedReason,
    }),
  );
}
