import { readFileSync } from "node:fs";
import { generateClassicLeastSquares, squareChordExcluded } from "../../src/core/classic-least-squares";
import { ClassicScoreGeometry } from "../../src/core/classic-score-cache";
import { generatePortraitEnhanced } from "../../src/core/portrait-enhancement";
import { validateInstruction } from "../../src/core/validation";
import { load, solve } from "./exp";
const { o } = load("photo-01");
const g = new ClassicScoreGeometry(o.profile, 500, (a, b) => squareChordExcluded(o.profile, a, b));
const fast = await generateClassicLeastSquares({ ...o, classicTuning: "classic-reference/4" }, g);
const slow = await generateClassicLeastSquares({ ...o, classicTuning: "classic-reference/4" });
const mine = solve(o, { gamma: 1.2, amp: 3 });
console.log("accel==plain", JSON.stringify(fast.segments[0].path) === JSON.stringify(slow.segments[0].path));
console.log("plain==experiment", JSON.stringify(slow.segments[0].path) === JSON.stringify(mine.segments[0].path));
await validateInstruction(fast);
// Production protected path: prep9 input, enhanced selection, /4.
const U = process.env.U ?? "output/";
const raw = new Uint8Array(readFileSync(U + "p16-1c-review/private/photo-01/F2-target.bin"));
const kp: any = structuredClone(o.kitPreparation); kp.version = "standard-preparation/9"; delete kp.tone;
for (const t of ["classic-reference/3", "classic-reference/4"] as const) {
  const s = performance.now();
  const i = await generatePortraitEnhanced({ ...o, pixels: raw, kitPreparation: kp, classicTuning: t });
  await validateInstruction(i);
  console.log(t, "enhanced ok", i.params.kitPreparation?.version, i.params.classic?.version, Math.round(performance.now() - s) + "ms");
}
