import { readFileSync } from "node:fs";
import { solve, evaluate } from "./exp";
import { sourceMidcontrast } from "../../src/core/source-midcontrast";
const U = (process.env.U ?? "output/") + "quality-original-20261026/combined-original-20261027-desktop-circle/";
const o = JSON.parse(readFileSync(U + "options.json", "utf8"));
const src = new Uint8Array(readFileSync(U + "target.bin"));
o.pixels = sourceMidcontrast(src, 500);
const faces = o.kitPreparation.transform.targetFaces;
for (const [vn, v] of Object.entries({ base: {}, "g1.2a3": { gamma: 1.2, amp: 3 } } as any)) {
  const s = evaluate("F0-photo-01-" + vn, solve(o, v as any), src, faces, o.profile.shape);
  console.log(vn, JSON.stringify(s));
}
