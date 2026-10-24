import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import { validateInstruction } from "../src/core/validation";
import { hash } from "../src/core/engine";
import { referenceRaster } from "../src/core/classic-reference";
import { inside } from "../src/core/geometry";
import { viewingSsim } from "../tests/helpers/viewing-ssim";
import { refinePhysicalRoute } from "./physical-route-refinement";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
const cases = [
  {
    name: "heart-single",
    dir: "output/current-heart-repair-v2/desktop/heart",
    guide: "guide.json",
    target: "prepared.png",
  },
  ...[
    "owner-phase9-circle",
    "owner-phase9-square",
    "synthetic-1-circle",
    "synthetic-2-circle",
    "synthetic-3-circle",
    "synthetic-pair-heart",
  ].map((name) => ({
    name,
    dir: "output/phase13/desktop/" + name,
    guide: "guide-v3-3000.json",
    target: "target.png",
  })),
];
const name = process.argv[2] ?? "heart-single",
  sample = cases.find((c) => c.name === name);
if (!sample) throw Error("Unknown case");
const regionalView = process.argv[3] === "regional-view";
const exactView = process.argv[3] === "exact-view";
const exactSsim = process.argv[3] === "exact-ssim";
const out =
  "output/physical-route-" +
  (exactSsim
    ? "ssim-v4/"
    : exactView
      ? "exact-v3/"
      : regionalView
        ? "view-v2/"
        : "v1/") +
  name;
if (existsSync(out + "/metrics.json"))
  throw Error("Preserve completed experiment");
mkdirSync(out, { recursive: true });
const guide = await validateInstruction(
  JSON.parse(readFileSync(sample.dir + "/" + sample.guide, "utf8")),
);
const file = readFileSync(sample.dir + "/" + sample.target),
  decoded = UPNG.decode(Uint8Array.from(file).buffer),
  rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]),
  pixels = rgba.filter((_, k) => k % 4 !== 3);
if (
  decoded.width !== 500 ||
  decoded.height !== 500 ||
  (await hash(pixels)) !== guide.imageHash
)
  throw Error("Frozen target does not match guide");
writeFileSync(out + "/target.png", file);
let last = 0;
const result = await refinePhysicalRoute(guide, pixels, {
  regionalView,
  exactView,
  exactSsim,
  proposals: exactSsim ? 4000 : exactView ? 8000 : 24000,
  progress: (value) => {
    if (performance.now() - last > 5000) {
      last = performance.now();
      process.stdout.write(
        JSON.stringify({ case: name, progress: value }) + "\n",
      );
    }
  },
});
const candidate = {
  ...guide,
  segments: [{ color: "#000000", path: result.path }],
};
const old = referenceRaster(guide, 1000),
  next = referenceRaster(candidate, 1000),
  target = Float32Array.from(
    { length: 500 * 500 },
    (_, k) => pixels[k * 3] / 255,
  );
const mask = Uint8Array.from({ length: 160 * 160 }, (_, k) =>
  inside(
    guide.profile.shape,
    ((k % 160) + 0.5) / 160,
    (Math.floor(k / 160) + 0.5) / 160,
  )
    ? 1
    : 0,
);
const scores = (rgb: Float32Array) =>
  viewingSsim(
    target,
    500,
    rgb.filter((_, k) => k % 3 === 0),
    1000,
    {
      faces: guide.params.kitPreparation?.transform.targetFaces,
      boardMask: mask,
    },
  );
const excess = (rgb: Float32Array) => {
  let sum = 0,
    count = 0;
  for (let y = 0; y < 1000; y++)
    for (let x = 0; x < 1000; x++) {
      if (
        target[Math.floor(y / 2) * 500 + Math.floor(x / 2)] > 0.97 &&
        inside(guide.profile.shape, (x + 0.5) / 1000, (y + 0.5) / 1000)
      ) {
        sum += 1 - rgb[(y * 1000 + x) * 3];
        count++;
      }
    }
  return sum / count;
};
const save = (rgb: Float32Array, path: string) => {
  const rgba = Uint8Array.from({ length: 1000 * 1000 * 4 }, (_, k) =>
    k % 4 === 3 ? 255 : Math.round(rgb[Math.floor(k / 4) * 3 + (k % 4)] * 255),
  );
  writeFileSync(path, Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0)));
};
save(old, out + "/before.png");
save(next, out + "/after.png");
const metrics = {
  case: name,
  sourceSequenceHash: guide.sequenceHash,
  targetHash: guide.imageHash,
  proposed: result.proposed,
  evaluated: result.evaluated,
  accepted: result.accepted,
  elapsedMs: result.elapsedMs,
  objectiveBefore: result.before,
  objectiveAfter: result.after,
  maxDegree: result.maxDegree,
  maxCrossing: result.maxCrossing,
  old: scores(old),
  candidate: scores(next),
  whiteExcess: { old: excess(old), candidate: excess(next) },
  verdict:
    "EXPERIMENTAL — requires visual and multi-case acceptance; no default/guide export",
};
writeFileSync(out + "/metrics.json", JSON.stringify(metrics, null, 2));
writeFileSync(
  out + "/route.json",
  JSON.stringify({
    schema: "iprasm.research-route/1",
    parentHash: guide.sequenceHash,
    path: result.path,
  }),
);
writeFileSync(
  out + "/report.html",
  `<!doctype html><meta charset="utf-8"><title>Physical route research</title><style>body{font:16px system-ui;max-width:1500px;margin:auto;padding:24px}section{display:flex;gap:12px}figure{margin:0;flex:1}img{width:100%}pre{white-space:pre-wrap}</style><h1>${name}</h1><p>Same target, placement, pins, 3000 continuous chords, .12mm and .9 opacity. Experimental vertex relocation, no photo overlay. Old guide unchanged.</p><section><figure><img src="target.png"><figcaption>Target</figcaption></figure><figure><img src="before.png"><figcaption>Unchanged classic3</figcaption></figure><figure><img src="after.png"><figcaption>Physical route refinement (experimental)</figcaption></figure></section><pre>${JSON.stringify(metrics, null, 2)}</pre>`,
);
console.log(JSON.stringify(metrics));
