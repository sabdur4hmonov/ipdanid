// Separate provisional material experiment, not a recommended validated kit.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { generateDensity } from "../src/core/density";
import {
  validateInstruction,
  parseProjectFile,
  progressFor,
} from "../src/core/validation";
import { hash } from "../src/core/engine";
const diameter = process.argv.includes("--quarter") ? 0.025 : 0.05;
const out = "output/thread-fineness" + (diameter === 0.025 ? "-025" : "");
mkdirSync(out, { recursive: true });
if (existsSync(out + "/candidate.json"))
  throw Error("Preserved experiment exists");
const source = JSON.parse(
  readFileSync("output/portrait-detail/white/control-guide.json", "utf8"),
);
const control = await validateInstruction(source.project.instruction),
  pixels = new Uint8Array(
    readFileSync("output/portrait-detail/white-tone.bin"),
  );
if ((await hash(pixels)) !== control.imageHash) throw Error("Target mismatch");
const profile = { ...structuredClone(control.profile), threadMm: diameter };
let cancelled = false,
  last = 0;
process.on("SIGINT", () => {
  cancelled = true;
});
const start = performance.now(),
  state = out + "/fit.json";
const instruction = await generateDensity(
  {
    pixels,
    profile,
    resolution: 160,
    portrait: control.params.portrait,
    lines: control.params.requestedLines,
    mode: control.params.mode,
    cancelled: () => cancelled,
    onProgress: (f) => {
      if (performance.now() - last > 15000) {
        last = performance.now();
        console.log("fine-thread", Math.round(f * 100) + "%");
      }
    },
  },
  {
    edgeWeight: 2,
    sweeps: 8,
    physical: control.params.optimization!.contrastPhysical,
    resume: existsSync(state)
      ? JSON.parse(readFileSync(state, "utf8"))
      : undefined,
    onCheckpoint: (s) => {
      writeFileSync(state + ".next", JSON.stringify(s));
      renameSync(state + ".next", state);
    },
  },
);
await validateInstruction(instruction);
const file = {
  schema: "iprasm.project/1",
  project: {
    ...source.project,
    id: crypto.randomUUID(),
    name: `Separate ${diameter} mm material trial`,
    instruction,
    progress: progressFor(instruction),
  },
  evidence: {
    stageMs: performance.now() - start,
    materialChanged: true,
    qualityAcceptance: "open",
    physicalAcceptance: false,
  },
};
await parseProjectFile(JSON.stringify(file));
writeFileSync(out + "/candidate.json", JSON.stringify(file, null, 2), {
  flag: "wx",
});
writeFileSync(out + "/control.json", JSON.stringify(source, null, 2), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    connections: instruction.metrics.lines,
    meters: instruction.metrics.estimatedMeters,
    hash: instruction.sequenceHash,
    ms: file.evidence.stageMs,
  }),
);
