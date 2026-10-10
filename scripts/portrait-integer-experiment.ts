// Owner-local research. The copied solver is private and never a released algorithm.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import {
  validateInstruction,
  parseProjectFile,
  progressFor,
} from "../src/core/validation";
import { hash } from "../src/core/engine";
const out = "output/integer-strands";
mkdirSync(out, { recursive: true });
if (existsSync(out + "/candidate.json"))
  throw Error("Preserved experiment exists");
const source = JSON.parse(
  readFileSync("output/portrait-detail/white/control-guide.json", "utf8"),
);
const control = await validateInstruction(source.project.instruction);
const pixels = new Uint8Array(
  readFileSync("output/portrait-detail/white-tone.bin"),
);
if ((await hash(pixels)) !== control.imageHash)
  throw Error("Original target mismatch");
let code = readFileSync("src/core/density.ts", "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/from "\.\//g, 'from "../src/core/');
const begin = code.indexOf(
  "    let best = { delta: 0, gain: 0 };\n    for (const delta of new Set(",
);
const end = code.indexOf("    return best;", begin);
if (begin < 0 || end < 0) throw Error("Private solver patch anchor changed");
code =
  'import { integerStrandMove } from "../scripts/integer-strand-search";\n' +
  code.slice(0, begin) +
  "    const best = integerStrandMove(-counts[id], Math.max(0, Math.min(pairLimit-counts[id], pinDegreeLimit-pinDegree[a], pinDegreeLimit-pinDegree[b], fitLimit-total)), d => gain(f,d), o.cancelled);\n" +
  code.slice(end);
mkdirSync("tmp", { recursive: true });
writeFileSync("tmp/density-complete-private.ts", code);
const { generateDensity } = await import("../tmp/density-complete-private.ts");
let cancelled = false,
  last = 0;
process.on("SIGINT", () => {
  cancelled = true;
});
const start = performance.now(),
  stateFile = out + "/fit.json";
const instruction = await generateDensity(
  {
    pixels,
    profile: control.profile,
    resolution: 160,
    portrait: control.params.portrait,
    lines: control.params.requestedLines,
    mode: control.params.mode,
    guarded: true,
    cancelled: () => cancelled,
    onProgress: (f) => {
      if (performance.now() - last > 15000) {
        last = performance.now();
        console.log("integer-search", Math.round(f * 100) + "%");
      }
    },
  },
  {
    edgeWeight: 2,
    sweeps: 8,
    physical: control.params.optimization!.contrastPhysical,
    resume: existsSync(stateFile)
      ? JSON.parse(readFileSync(stateFile, "utf8"))
      : undefined,
    onCheckpoint: (s) => {
      writeFileSync(stateFile + ".next", JSON.stringify(s));
      renameSync(stateFile + ".next", stateFile);
    },
  },
);
await validateInstruction(instruction);
const file = {
  schema: "iprasm.project/1",
  project: {
    ...source.project,
    id: crypto.randomUUID(),
    name: "Private complete integer search",
    instruction,
    progress: progressFor(instruction),
  },
  evidence: {
    strategy: "complete-integer-coordinate/1",
    researchOnly: true,
    releasedAlgorithm: false,
    stageMs: performance.now() - start,
    referenceHash: control.sequenceHash,
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
