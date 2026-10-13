import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import {
  validateInstruction,
  progressFor,
  parseProjectFile,
  toTxt,
  fromFile,
} from "../src/core/validation";
import { hash } from "../src/core/engine";
import UPNGModule from "@pdf-lib/upng";
import { rasterSequence } from "../src/core/optical";
import { Distribution } from "../src/core/distribution";
const src = "output/portrait-dispatch",
  out = "output/resolved-convergence";
const UPNG: any = (UPNGModule as any).default ?? UPNGModule;
function previewPng(i: any) {
  const n = i.params.resolution,
    r = rasterSequence(i),
    rgba = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    for (let c = 0; c < 3; c++)
      rgba[k * 4 + c] = Math.round(r[k * 3 + c] * 255);
    rgba[k * 4 + 3] = 255;
  }
  return new Uint8Array(UPNG.encode([rgba.buffer], n, n, 0));
}
mkdirSync(out, { recursive: true });
if (existsSync(out + "/final.json"))
  throw Error("Completed experiment is sealed; preserve it");
const rootFile = JSON.parse(readFileSync(src + "/resolved240.json", "utf8"));
const reference = await validateInstruction(rootFile.project.instruction);
const original: DensityCheckpoint = JSON.parse(
  readFileSync(src + "/resolved240-fit.json", "utf8"),
);
const originalText = JSON.stringify(original);
const pixels = new Uint8Array(readFileSync(src + "/target-320.bin"));
if ((await hash(pixels)) !== reference.imageHash)
  throw Error("Wrong frozen target");
const extension = {
  version: "resolved-convergence/1" as const,
  checkpoint: original,
  priorSweepLimit: 8,
  reference,
};
const options = {
  profile: reference.profile,
  pixels,
  resolution: 320,
  lines: reference.params.requestedLines,
  portrait: reference.params.portrait,
  mode: reference.params.mode,
};
const tuning = {
  resolved: true,
  physical: defaultPhysicalContrast(),
  edgeWeight: 2,
  sweeps: 24,
  extension,
};
let stop = false,
  interruptAt12 = !existsSync(out + "/interrupted-12.json");
process.on("SIGINT", () => {
  stop = true;
});
const cancelled = () => stop || existsSync(out + "/cancel.flag");
const start = performance.now();
let rss = process.memoryUsage().rss,
  last = 0;
const diagnostics: any[] = [];
const stateFile = out + "/latest-fit.json";
const atomic = (path: string, data: unknown) => {
  writeFileSync(path + ".next", JSON.stringify(data));
  renameSync(path + ".next", path);
};
async function inspectState(cp: DensityCheckpoint) {
  const path = `${out}/sweep-${cp.sweeps}.json`;
  if (existsSync(path)) {
    const i = JSON.parse(readFileSync(path, "utf8")).project.instruction;
    await validateInstruction(i);
    writeFileSync(`${out}/sweep-${cp.sweeps}.png`, previewPng(i));
    writeFileSync(`${out}/sweep-${cp.sweeps}.txt`, toTxt(i));
    return;
  }
  const wall = performance.now();
  const i = await generateDensity(options, {
    ...tuning,
    resume: cp,
    materializeOnly: true,
  });
  await validateInstruction(i);
  const file = {
    schema: "iprasm.project/1",
    project: {
      ...rootFile.project,
      id: crypto.randomUUID(),
      name: `Resolved convergence / total ${cp.sweeps}`,
      instruction: i,
      progress: progressFor(i),
    },
    evidence: {
      priorSweeps: 8,
      additionalSweeps: cp.sweeps - 8,
      totalSweeps: cp.sweeps,
      physicalAcceptance: false,
      qualityAcceptance: "uninspected",
      materializeMs: performance.now() - wall,
      sampledPeakRss: rss,
      elapsedAdditionalWallMs: performance.now() - start,
      priorGenerationWallMs: rootFile.evidence.elapsedMs,
    },
  };
  await parseProjectFile(JSON.stringify(file));
  const text = toTxt(i);
  if ((await fromFile(text)).sequenceHash !== i.sequenceHash)
    throw Error("Export mismatch");
  const d = new Distribution(i.profile.pins.length, i.segments);
  if (Math.max(...d.degree) > 160 || Math.max(...d.pairs.values()) > 32)
    throw Error("Distribution failure");
  writeFileSync(path, JSON.stringify(file, null, 2), { flag: "wx" });
  writeFileSync(`${out}/sweep-${cp.sweeps}.png`, previewPng(i));
  writeFileSync(`${out}/sweep-${cp.sweeps}.txt`, text);
  console.log(
    JSON.stringify({
      stage: "executable-checkpoint",
      sweep: cp.sweeps,
      hash: i.sequenceHash,
      lines: i.metrics.lines,
      meters: i.metrics.estimatedMeters,
      routes: i.metrics.densityFit?.routingConnections,
      maxChord: Math.max(...d.pairs.values()),
      maxIncident: Math.max(...d.degree),
    }),
  );
}
const run = async () =>
  generateDensity(
    {
      ...options,
      cancelled,
      onProgress: () => {
        rss = Math.max(rss, process.memoryUsage().rss);
        if (performance.now() - last > 15000) {
          last = performance.now();
          console.log(
            JSON.stringify({
              stage: "running",
              elapsedAdditionalWallMs: performance.now() - start,
              sampledPeakRss: rss,
            }),
          );
        }
      },
      onDiagnostic: (d: any) => {
        if (d.stage === "fit" || d.stage === "routing") {
          diagnostics.push(d);
          atomic(out + "/stages.json", diagnostics);
          console.log(JSON.stringify(d));
        }
      },
    },
    {
      ...tuning,
      resume: existsSync(stateFile)
        ? JSON.parse(readFileSync(stateFile, "utf8"))
        : undefined,
      onCheckpoint: async (cp) => {
        atomic(stateFile, cp);
        writeFileSync(`${out}/fit-${cp.sweeps}.json`, JSON.stringify(cp), {
          flag: "wx",
        });
        if (cp.sweeps % 4 === 0 || cp.plateau) await inspectState(cp);
        if (interruptAt12 && cp.sweeps === 12) {
          writeFileSync(
            out + "/interrupted-12.json",
            JSON.stringify({
              checkpointChecksum: cp.checksum,
              sweep: cp.sweeps,
              kind: "deliberate-recovery-check",
            }),
            { flag: "wx" },
          );
          stop = true;
        }
      },
    },
  );
if (existsSync(stateFile)) {
  const cp: DensityCheckpoint = JSON.parse(readFileSync(stateFile, "utf8"));
  if (cp.sweeps % 4 === 0) await inspectState(cp);
  if (cp.sweeps === 12 && !existsSync(out + "/interrupted-12.json")) {
    writeFileSync(
      out + "/interrupted-12.json",
      JSON.stringify({
        checkpointChecksum: cp.checksum,
        sweep: 12,
        kind: "recovery-after-report-PNG-import-failure",
        error:
          "UPNG.encode is not a function; source module default interop corrected",
        exactSavedStateUnchanged: true,
      }),
      { flag: "wx" },
    );
    interruptAt12 = false;
  }
}
let final;
try {
  final = await run();
} catch (error) {
  if (
    !(error instanceof DOMException && error.name === "AbortError") ||
    !interruptAt12 ||
    !existsSync(out + "/interrupted-12.json") ||
    existsSync(out + "/cancel.flag")
  )
    throw error;
  console.log(
    JSON.stringify({ stage: "recovery", prior: 8, additional: 4, total: 12 }),
  );
  stop = false;
  interruptAt12 = false;
  final = await run();
}
const cp: DensityCheckpoint = JSON.parse(readFileSync(stateFile, "utf8"));
await inspectState(cp);
if (JSON.stringify(original) !== originalText)
  throw Error("Original state was mutated");
const replay = await generateDensity(options, {
  ...tuning,
  resume: cp,
  materializeOnly: true,
});
if (
  replay.segments.toString() !== final.segments.toString() ||
  JSON.stringify(replay.segments) !== JSON.stringify(final.segments)
)
  throw Error("Recovery sequence mismatch");
// Snapshot metadata intentionally changes the hash; compare exact ordered strands.
await validateInstruction(final);
const file = {
  schema: "iprasm.project/1",
  project: {
    ...rootFile.project,
    id: crypto.randomUUID(),
    name: "Resolved convergence / final",
    instruction: final,
    progress: progressFor(final),
  },
  evidence: {
    priorSweeps: 8,
    additionalSweeps: cp.sweeps - 8,
    totalSweeps: cp.sweeps,
    priorGenerationWallMs: rootFile.evidence.elapsedMs,
    elapsedAdditionalWallMs: performance.now() - start,
    sampledPeakRss: rss,
    exactMaterializedStrands: true,
    physicalAcceptance: false,
    qualityAcceptance: "uninspected",
  },
};
await parseProjectFile(JSON.stringify(file));
writeFileSync(out + "/final.json", JSON.stringify(file, null, 2), {
  flag: "wx",
});
writeFileSync(out + "/final.png", previewPng(final));
console.log(JSON.stringify(file.evidence));
