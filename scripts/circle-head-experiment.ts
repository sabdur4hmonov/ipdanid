// Disclosed board/crop experiments; same original source/materials, preserved old guides.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createProfile, assertPinSpacing } from "../src/core/geometry";
import { generate } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { validateInstruction, progressFor } from "../src/core/validation";
import { Distribution } from "../src/core/distribution";
import { rasterSequence } from "../src/core/optical";
import type { Project } from "../src/core/types";
const pinCount = Number(process.argv[2] ?? 160);
if (![160, 240].includes(pinCount))
  throw Error("Supported explicit experiments:160 or240pins");
const cleanBackground = process.argv.includes("--clean-background");
const resolution = process.argv.includes("--resolution=192") ? 192 : 160;
const faceFraming = process.argv.includes("--face-framing");
if (faceFraming && (pinCount !== 240 || resolution !== 160 || cleanBackground))
  throw Error("Face framing uses the separate240-pin/160 target only");
const circleFit = faceFraming
  ? JSON.parse(
      readFileSync("output/circle-head-240/circle-settings.json", "utf8"),
    )
  : null;
const fixedFit =
  resolution === 192
    ? JSON.parse(
        readFileSync("output/circle-head-240/circle-settings.json", "utf8"),
      )
    : null;
const out =
  (pinCount === 160 ? "output/circle-head" : "output/circle-head-240") +
  (cleanBackground ? "-clean" : "") +
  (resolution === 192 ? "-192" : "") +
  (faceFraming ? "-face" : "");
mkdirSync(out, { recursive: true });
const baseline = JSON.parse(
  readFileSync("output/outline/baseline.json", "utf8"),
).project as Project;
const heart = JSON.parse(
  readFileSync("output/outline/outline-guide.json", "utf8"),
).project as Project;
await validateInstruction(baseline.instruction);
await validateInstruction(heart.instruction);
const selection = JSON.parse(
  readFileSync("output/outline/selection.json", "utf8"),
);
const sourceHash = createHash("sha256")
  .update(readFileSync("output/outline/source.jpg"))
  .digest("hex");
if (sourceHash !== selection.sourceHash) throw Error("Source mismatch");
const b = baseline.instruction.profile;
const circle = createProfile(
  "circle",
  pinCount,
  baseline.instruction.params.mode,
  { widthMm: b.widthMm, heightMm: b.heightMm },
);
const profile = {
  ...b,
  id: `separate-circle-head-${pinCount}`,
  shape: circle.shape,
  pins: circle.pins,
  pinLayout: circle.pinLayout,
};
assertPinSpacing(profile);
const browser = await chromium.launch({ headless: true });
let prepared: any;
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  prepared = await page.evaluate(
    async ({
      baseline,
      selection,
      profile,
      cleanBackground,
      resolution,
      fixedFit,
      circleFit,
    }) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts");
      const { processPortrait, putRgb } = await import("/src/core/portrait.ts");
      const { fitMarkedOutline } = await import("/src/core/head-outline.ts");
      const { remapPortrait, fitMarkedFace } =
        await import("/src/core/shape-crop.ts");
      const { hash } = await import("/src/core/engine.ts");
      const { outlineBackgroundMask, inOutline } =
        await import("/src/core/outline-background.ts");
      const { sourceToTarget } = await import("/src/core/coordinates.ts");
      const image = await loadPhoto(
        new File(
          [await (await fetch("/output/outline/source.jpg")).blob()],
          "source.jpg",
          { type: "image/jpeg" },
        ),
      );
      const n = resolution;
      const old = circleFit ? circleFit.edits : baseline.edits;
      const oldPortrait = circleFit
        ? circleFit.portrait
        : baseline.instruction.params.portrait;
      const began = performance.now();
      const fit = circleFit
        ? fitMarkedFace(
            "circle",
            circleFit.portrait.face,
            old,
            1,
            profile.widthMm,
            profile.heightMm,
            n,
          )
        : fixedFit
          ? { edits: fixedFit.edits, ratio: fixedFit.ratio }
          : fitMarkedOutline(
              "circle",
              selection.sourcePoints,
              old,
              1,
              profile.widthMm,
              profile.heightMm,
              image.width,
              image.height,
              n,
            );
      const portrait = remapPortrait(
        oldPortrait,
        old,
        fit.edits,
        image.width,
        image.height,
        1,
        n,
        1,
        baseline.instruction.params.resolution,
      );
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const raw = prepare(c.getContext("2d")!, image, fit.edits, 1),
        source = c.toDataURL();
      const referencePixels = processPortrait(raw, n, portrait);
      let preservedHeadPixels = 0,
        lightenedBackgroundPixels = 0;
      if (cleanBackground) {
        portrait.backgroundMode = "manual-light";
        portrait.backgroundMask = outlineBackgroundMask(
          selection.sourcePoints,
          fit.edits,
          1,
          image.width,
          image.height,
          n,
        );
      }
      const pixels = processPortrait(raw, n, portrait);
      const polygon = selection.sourcePoints.map((p: any) =>
        sourceToTarget(
          p.x * image.width,
          p.y * image.height,
          image.width,
          image.height,
          fit.edits,
          1,
          n,
        ),
      );
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = (y * n + x) * 3;
          if (inOutline({ x: x / (n - 1), y: y / (n - 1) }, polygon)) {
            if (
              pixels[i] !== referencePixels[i] ||
              pixels[i + 1] !== referencePixels[i + 1] ||
              pixels[i + 2] !== referencePixels[i + 2]
            )
              throw Error("Head pixels changed");
            preservedHeadPixels++;
          } else if (pixels[i] > referencePixels[i])
            lightenedBackgroundPixels++;
        }
      putRgb(c.getContext("2d")!, pixels, n);
      image.close();
      return {
        edits: fit.edits,
        portrait,
        ratio: fit.ratio,
        geometryMs: performance.now() - began,
        source,
        target: c.toDataURL(),
        pixels: Array.from(pixels),
        imageHash: await hash(pixels),
        preservedHeadPixels,
        lightenedBackgroundPixels,
      };
    },
    {
      baseline,
      selection,
      profile,
      cleanBackground,
      resolution,
      fixedFit,
      circleFit,
    },
  );
} finally {
  await browser.close();
}
for (const key of ["source", "target"])
  writeFileSync(
    `${out}/circle-${key}.png`,
    Buffer.from(prepared[key].split(",")[1], "base64"),
  );
writeFileSync(`${out}/circle-target.bin`, new Uint8Array(prepared.pixels));
writeFileSync(
  `${out}/circle-settings.json`,
  JSON.stringify(
    {
      edits: prepared.edits,
      portrait: prepared.portrait,
      ratio: prepared.ratio,
      imageHash: prepared.imageHash,
    },
    null,
    2,
  ),
);
writeFileSync(
  `${out}/selection.json`,
  JSON.stringify(
    {
      sourceHash,
      sourcePoints: selection.sourcePoints,
      priorHeartHash: heart.instruction.sequenceHash,
      baselineHash: baseline.instruction.sequenceHash,
      changed: faceFraming
        ? "Separate face-centered crop; existing manual face box fitted with4mm clearance; hair can be cropped. Same240pins/400mm/.1mm/160sampling/eight physical sweeps/weight2/32-160 guards. Not whole-head containment or equivalent simplification."
        : `explicit circle/${pinCount}pins;400mm,.1mm,${resolution}computation,32/160 limits and8sweeps; separate guide; 192 retains exact240-circle crop`,
      geometryMs: prepared.geometryMs,
      cleanBackground,
      preservedHeadPixels: prepared.preservedHeadPixels,
      lightenedBackgroundPixels: prepared.lightenedBackgroundPixels,
    },
    null,
    2,
  ),
);
const file = `${out}/circle-guide.json`;
if (existsSync(file)) {
  const saved = await validateInstruction(
    JSON.parse(readFileSync(file, "utf8")).project.instruction,
  );
  if (saved.imageHash !== prepared.imageHash)
    throw Error("Preserve saved experiment with different target");
  console.log("Retained", saved.sequenceHash);
  process.exit(0);
}
const began = performance.now();
let last = 0,
  peak = process.memoryUsage().rss;
const options = {
  pixels: new Uint8Array(prepared.pixels),
  resolution,
  profile,
  portrait: prepared.portrait,
  lines: baseline.instruction.params.requestedLines,
  mode: baseline.instruction.params.mode,
  guarded: true,
  onProgress: (f: number) => {
    peak = Math.max(peak, process.memoryUsage().rss);
    if (performance.now() - last > 15000) {
      console.log("circle compute", Math.round(f * 100) + "%");
      last = performance.now();
    }
  },
};
const basis = await generate(options);
await validateInstruction(basis);
const instruction = await generateDensity(
  { ...options, seed: basis },
  {
    edgeWeight: 2,
    sweeps: 8,
    physical: baseline.instruction.params.optimization!.contrastPhysical,
  },
);
await validateInstruction(instruction);
if (instruction.imageHash !== prepared.imageHash)
  throw Error("Target mismatch");
const d = new Distribution(profile.pins.length, instruction.segments);
if (Math.max(...d.pairs.values()) > 32 || Math.max(...d.degree) > 160)
  throw Error("Distribution guard violated");
const project: Project = {
  id: crypto.randomUUID(),
  name: `Separate centered whole-head circle /${pinCount}pins/.1mm${cleanBackground ? " /manual clean background" : ""}`,
  instruction,
  edits: prepared.edits,
  progress: progressFor(instruction),
};
if (faceFraming)
  project.name =
    "Separate face-centered circle /240pins/.1mm /hair may be cropped";
writeFileSync(
  file,
  JSON.stringify({ schema: "iprasm.project/1", project }, null, 2),
  { flag: "wx" },
);
const raster = rasterSequence(instruction);
writeFileSync(
  `${out}/circle-sequence.f32`,
  Buffer.from(raster.buffer, raster.byteOffset, raster.byteLength),
);
const result = {
  fullMs: performance.now() - began,
  sampledPeakRss: peak,
  sequenceHash: instruction.sequenceHash,
  imageHash: instruction.imageHash,
  connections: instruction.metrics.lines,
  meters: instruction.metrics.estimatedMeters,
  fitRatio: prepared.ratio,
  maxRepeat: Math.max(...d.pairs.values()),
  maxIncident: Math.max(...d.degree),
  qualityAcceptance: "open",
  physicallyValidated: false,
};
writeFileSync(`${out}/circle-compute.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
