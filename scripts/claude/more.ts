import { readFileSync } from "node:fs";
import { solve, evaluate } from "./exp";
import { generateClassicLeastSquares } from "../../src/core/classic-least-squares";
import { sourceMidcontrast } from "../../src/core/source-midcontrast";
const U = (process.env.U ?? "output/");
const runs: [string, string, string | null, boolean][] = [
  ["F2-photo-03-heart", "combined-original-20261027-desktop-heart", "photo-03", true],
  ["F0-heart", "combined-original-20261027-desktop-heart", null, true],
  ["F0-square", "recheck-original-20261027-desktop-square", null, false],
];
for (const [name, folder, f2, prep10] of runs) {
  const o = JSON.parse(readFileSync(U + "quality-original-20261026/" + folder + "/options.json", "utf8"));
  let src = new Uint8Array(readFileSync(U + "quality-original-20261026/" + folder + "/target.bin"));
  if (f2) {
    src = new Uint8Array(readFileSync(U + `p16-1c-review/private/${f2}/F2-target.bin`));
    o.kitPreparation.transform = JSON.parse(readFileSync(U + `p16-1c-review/private/${f2}/F2-framing.json`, "utf8")).framing.transform;
  }
  o.pixels = prep10 ? sourceMidcontrast(src, 500) : src;
  const faces = o.kitPreparation.transform.targetFaces;
  const prod = await generateClassicLeastSquares(o), mine = solve(o, {});
  console.log(name, "repro", JSON.stringify(prod.segments[0].path) === JSON.stringify(mine.segments[0].path));
  for (const [vn, v] of Object.entries({ base: {}, "g1.2a3": { gamma: 1.2, amp: 3 } } as any)) {
    const s = evaluate(name + "-" + vn, vn === "base" ? mine : solve(o, v as any), src, faces, o.profile.shape);
    console.log(name, vn, Object.entries(s).map(([k, x]) => k + " " + (x as number).toFixed(4)).join(" "));
  }
}
