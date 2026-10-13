import { writeFileSync, mkdirSync } from "node:fs";
import { generate } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { createProfile, inside } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { rasterSequence } from "../src/core/optical";
import {
  PhysicalContrast,
  defaultPhysicalContrast,
} from "../src/core/physical-contrast";
import { anatomicalImportance } from "../src/core/anatomical-importance";
import { validateInstruction } from "../src/core/validation";
import { Distribution } from "../src/core/distribution";
const n = 48,
  profile = createProfile("circle", 32),
  portrait = { ...DEFAULT_PORTRAIT, enabled: true };
const known = await generate({
  profile,
  portrait,
  resolution: n,
  lines: 180,
  mode: "dark",
  guarded: true,
  pixels: new Uint8Array(n * n * 3).fill(170),
});
await validateInstruction(known);
const source = rasterSequence(known),
  pixels = Uint8Array.from(source, (x) => Math.round(x * 255));
const goal = Float64Array.from(
  { length: n * n },
  (_, k) => (pixels[k * 3] + pixels[k * 3 + 1] + pixels[k * 3 + 2]) / 765,
);
const mask = Uint8Array.from(
  { length: n * n },
  (_, k) => +inside("circle", (k % n) / (n - 1), Math.floor(k / n) / (n - 1)),
);
const importance = anatomicalImportance(portrait),
  weight = Float64Array.from({ length: n * n }, (_, k) =>
    mask[k] ? importance((k % n) / (n - 1), Math.floor(k / n) / (n - 1)) : 0,
  );
const physical = defaultPhysicalContrast(),
  contrast = new PhysicalContrast(n, profile, mask, weight, 2, physical),
  weightSum = weight.reduce((a, b) => a + b, 0);
const objective = (r: Float32Array) => {
  const residual = Float64Array.from(
    goal,
    (_, k) => (r[k * 3] + r[k * 3 + 1] + r[k * 3 + 2]) / 3 - goal[k],
  );
  let v = contrast.objective(residual);
  for (let k = 0; k < goal.length; k++) {
    const over =
      1 + 1.5 * Math.max(0, Math.min(1, (goal[k] - 0.35) / 0.45)) ** 2;
    v += weight[k] * residual[k] ** 2 * (residual[k] < 0 ? over : 1);
  }
  return v / weightSum;
};
const start = performance.now(),
  stages: any[] = [];
const solved = await generateDensity(
  {
    profile,
    portrait,
    resolution: n,
    lines: 400,
    mode: "dark",
    pixels,
    onDiagnostic: (d) => stages.push(d),
  },
  { physical, edgeWeight: 2, sweeps: 24 },
);
await validateInstruction(solved);
const d = new Distribution(profile.pins.length, solved.segments);
const a = objective(source),
  b = objective(rasterSequence(solved));
mkdirSync("output/resolved-convergence", { recursive: true });
const result = {
  purpose:
    "Known feasible optical target; synthetic diagnostic, not owner-photo improvement or a physical model validation",
  knownSequence: known.sequenceHash,
  knownLines: known.metrics.lines,
  knownObjective: a,
  solvedSequence: solved.sequenceHash,
  solvedLines: solved.metrics.lines,
  solvedObjective: b,
  gap: b - a,
  knownPathFitsBudget: known.metrics.lines <= 400,
  actualSweeps: solved.metrics.densityFit?.sweeps,
  stop: solved.metrics.stoppedReason,
  elapsedMs: performance.now() - start,
  maxChord: Math.max(...d.pairs.values()),
  maxIncident: Math.max(...d.degree),
  interpretation:
    b > a + 1e-6
      ? "A known feasible sequence beats this bounded search: search limitation demonstrated for this synthetic case; owner target attainability not established"
      : "No material search gap demonstrated for this synthetic case",
  stages,
};
writeFileSync(
  "output/resolved-convergence/known-feasible.json",
  JSON.stringify(result, null, 2),
  { flag: "wx" },
);
console.log(JSON.stringify({ ...result, stages: undefined }));
