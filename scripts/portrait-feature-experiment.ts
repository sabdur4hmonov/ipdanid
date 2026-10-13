import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { generateDensity } from "../src/core/density";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { DEFAULT_FEATURE_CONTRAST } from "../src/core/feature-contrast";
import {
  validateInstruction,
  progressFor,
  parseProjectFile,
} from "../src/core/validation";
import { hash } from "../src/core/engine";
const out = "output/feature-contrast",
  src = "output/resolved-convergence";
mkdirSync(out, { recursive: true });
const parent = JSON.parse(readFileSync(src + "/final.json", "utf8")),
  seed = await validateInstruction(parent.project.instruction);
const pixels = new Uint8Array(
  readFileSync("output/portrait-dispatch/target-320.bin"),
);
if ((await hash(pixels)) !== seed.imageHash) throw Error("Wrong target");
let stop = false;
process.on("SIGINT", () => (stop = true));
for (const name of ["control", "features"] as const) {
  if (existsSync(`${out}/${name}.json`)) continue;
  const state = `${out}/${name}-fit.json`,
    start = performance.now();
  let rss = process.memoryUsage().rss,
    last = 0;
  const options = {
    pixels,
    resolution: 320,
    profile: seed.profile,
    portrait: seed.params.portrait,
    mode: seed.params.mode,
    lines: seed.params.requestedLines,
    seed,
    cancelled: () => stop || existsSync(out + "/cancel.flag"),
    onProgress: () => {
      rss = Math.max(rss, process.memoryUsage().rss);
      if (performance.now() - last > 15000) {
        last = performance.now();
        console.log(
          JSON.stringify({
            name,
            elapsedMs: performance.now() - start,
            sampledPeakRss: rss,
          }),
        );
      }
    },
    onDiagnostic: (d: any) => {
      if (d.stage === "fit" || d.stage === "routing")
        console.log(JSON.stringify({ name, ...d }));
    },
  };
  const i = await generateDensity(options, {
    resolved: true,
    physical: defaultPhysicalContrast(),
    edgeWeight: 2,
    sweeps: 8,
    ...(name === "features" ? { features: DEFAULT_FEATURE_CONTRAST } : {}),
    resume: existsSync(state)
      ? JSON.parse(readFileSync(state, "utf8"))
      : undefined,
    onCheckpoint: (s) => {
      writeFileSync(state + ".next", JSON.stringify(s));
      renameSync(state + ".next", state);
      writeFileSync(
        `${out}/${name}-sweep-${s.sweeps}.json`,
        JSON.stringify(s),
        { flag: "wx" },
      );
    },
  });
  await validateInstruction(i);
  const file = {
    schema: "iprasm.project/1",
    project: {
      ...parent.project,
      id: crypto.randomUUID(),
      name: `Fine feature contrast / ${name}`,
      instruction: i,
      progress: progressFor(i),
    },
    evidence: {
      searchSweeps: 8,
      evaluations: i.metrics.densityFit?.evaluations,
      elapsedMs: performance.now() - start,
      sampledPeakRss: rss,
      rootSequence: seed.sequenceHash,
      startingPoint:
        "Complete immutable24-sweep path, including all54 routes. New fixed8-sweep refinement budget for each objective; not replay of old8sweeps or modification of old fit checkpoint.",
      physicalAcceptance: false,
      qualityAcceptance: "uninspected",
    },
  };
  await parseProjectFile(JSON.stringify(file));
  writeFileSync(`${out}/${name}.json`, JSON.stringify(file, null, 2), {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      name,
      hash: i.sequenceHash,
      lines: i.metrics.lines,
      elapsedMs: file.evidence.elapsedMs,
    }),
  );
}
