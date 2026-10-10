import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { validateInstruction, progressFor } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
const out = "output/portrait-detail";
mkdirSync(out, { recursive: true });
const control = await validateInstruction(
    JSON.parse(readFileSync("output/pin-basis/control-240.json", "utf8"))
      .project.instruction,
  ),
  pixels = new Uint8Array(readFileSync(out + "/target.bin")),
  portrait = {
    ...structuredClone(control.params.portrait!),
    detailStyle: "contour-preparation/1" as const,
  };
if (existsSync(out + "/candidate.json")) throw Error("Preserved result exists");
let cancelled = false,
  last = 0;
process.on("SIGINT", () => {
  cancelled = true;
});
const start = performance.now(),
  stateFile = out + "/fit.json";
const i = await generateDensity(
  {
    pixels,
    resolution: 160,
    profile: control.profile,
    portrait,
    lines: control.params.requestedLines,
    mode: control.params.mode,
    cancelled: () => cancelled,
    onProgress: (f) => {
      if (performance.now() - last > 12000) {
        last = performance.now();
        console.log("detail", Math.round(f * 100) + "%");
      }
    },
  },
  {
    edgeWeight: control.params.optimization!.edgeWeight!,
    sweeps: control.params.optimization!.sweeps!,
    physical: control.params.optimization!.contrastPhysical,
    resume: existsSync(stateFile)
      ? (JSON.parse(readFileSync(stateFile, "utf8")) as DensityCheckpoint)
      : undefined,
    onCheckpoint: (s) => {
      writeFileSync(stateFile + ".next", JSON.stringify(s));
      renameSync(stateFile + ".next", stateFile);
    },
  },
);
await validateInstruction(i);
const evidence = {
  stageMs: performance.now() - start,
  sourceHash: i.imageHash,
  referenceHash: control.sequenceHash,
  sequenceHash: i.sequenceHash,
  connections: i.metrics.lines,
  meters: i.metrics.estimatedMeters,
  sameMaterial: JSON.stringify(i.profile) === JSON.stringify(control.profile),
  sameTarget: false,
  targetChangedBy: "pixel-derived contour-preparation/1",
  qualityAcceptance: "open",
  physicalAcceptance: false,
};
writeFileSync(
  out + "/candidate.json",
  JSON.stringify(
    {
      schema: "iprasm.project/1",
      project: {
        id: crypto.randomUUID(),
        name: "Pixel-derived contour portrait",
        edits: JSON.parse(readFileSync("output/circle-head-240/circle-settings.json", "utf8")).edits,
        instruction: i,
        progress: progressFor(i),
      },
      evidence,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
writeFileSync(
  out + "/control.json",
  JSON.stringify(
    {
      schema: "iprasm.project/1",
      project: {
        id: crypto.randomUUID(),
        name: "Preserved original tone target",
        edits: JSON.parse(readFileSync("output/circle-head-240/circle-settings.json", "utf8")).edits,
        instruction: control,
        progress: progressFor(control),
      },
    },
    null,
    2,
  ),
  { flag: "wx" },
);
const raster = rasterSequence(i);
writeFileSync(out + "/candidate.f32", Buffer.from(raster.buffer));
console.log(JSON.stringify(evidence));
