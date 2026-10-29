import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { root, cases, fixtureRoot } from "./benchmark";
const path = "docs/P16_1C_PARAMETERS.json";
if (existsSync(path)) throw Error("Framing parameters already frozen");
const p = JSON.parse(readFileSync(root + "/private/preparation.json", "utf8"));
const sha = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const frozen = p.settings.map(
  (s: {
    id: string;
    source: string;
    shape: string;
    framing: { level: string; achievedHeight: number; transform: unknown };
  }) => {
    const c = cases.find((c) => c.id === s.id)!;
    const o = JSON.parse(
      readFileSync(fixtureRoot + c.folder + "/options.json", "utf8"),
    );
    const scale = o.profile.standardKit.patternScale;
    return {
      ...s,
      targetSha256: sha(
        `${root}/private/${s.id}/${s.framing.level}-target.bin`,
      ),
      profileSha256: createHash("sha256")
        .update(JSON.stringify(o.profile))
        .digest("hex"),
      physical: {
        baseMm: 500,
        patternScale: scale,
        nominalInnerHeightMm: 500 * scale,
        faceHeightMm: s.framing.achievedHeight * 500 * scale,
        noseBoard: { x: 0.5, y: 0.5 - 0.08 * scale },
      },
    };
  },
);
writeFileSync(
  path,
  JSON.stringify(
    {
      schema: "p16-1c/frozen-framing/1",
      date: "2026-10-29",
      scope:
        "Four owner-confirmed existing source files; six cases; no composites/captions",
      analysis: p.analyses,
      settings: frozen,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
const lines = frozen.map(
  (s: {
    id: string;
    shape: string;
    framing: {
      level: string;
      achievedHeight: number;
      zoomCapped: boolean;
      transform: {
        framing: { adjustments: { zoom: number; x: number; y: number }[] };
      };
    };
    physical: { faceHeightMm: number };
  }) => {
    const a = s.framing.transform.framing.adjustments[0];
    return `| ${s.id} | ${s.shape} | ${s.framing.level} | ${s.framing.achievedHeight.toFixed(6)} | ${a.zoom.toFixed(9)} | ${a.x.toFixed(9)} | ${a.y.toFixed(9)} | ${s.physical.faceHeightMm.toFixed(3)} | ${s.framing.zoomCapped ? "yes" : "no"} |`;
  },
);
writeFileSync(
  "docs/P16_1C_FRAMING_REVIEW.md",
  readFileSync("docs/P16_1C_FRAMING_REVIEW.md", "utf8") +
    "\n## Exact frozen values (before fitting)\n\nFull-precision source anchors, target bounds, profile/target hashes and physical conversions: P16_1C_PARAMETERS.json. Below are display-rounded values; all nose tips map to(0.5,0.42).\n\n| Case | Shape | Level | Face height / inner height | Zoom | Pan x | Pan y | Face mm | Zoom capped |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n" +
    lines.join("\n") +
    "\n",
);
console.log("Twelve exact parameter sets frozen before fitting");
