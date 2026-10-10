import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { chromium } from "@playwright/test";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import {
  validateInstruction,
  parseProjectFile,
  progressFor,
} from "../src/core/validation";
const out = "output/portrait-detail/natural";
mkdirSync(out, { recursive: true });
const source = JSON.parse(
  readFileSync("output/portrait-detail/white/control-guide.json", "utf8"),
);
const control = await validateInstruction(source.project.instruction),
  portrait = {
    ...structuredClone(control.params.portrait!),
    detailStyle: "contour-preparation/2" as const,
  };
if (existsSync(out + "/candidate-guide.json"))
  throw Error("Preserved natural guide exists");
const browser = await chromium.launch({ headless: true });
let pixels: Uint8Array;
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  const r = await page.evaluate(async (portrait) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts" as string),
      { processPortrait, putRgb } = await import(
        "/src/core/portrait.ts" as string
      );
    const im = await loadPhoto(
        new File(
          [
            await (
              await fetch("/output/portrait-detail/white-source.png")
            ).blob(),
          ],
          "source.png",
          { type: "image/png" },
        ),
      ),
      settings = await (
        await fetch("/output/circle-head-240/circle-settings.json")
      ).json(),
      c = document.createElement("canvas");
    c.width = c.height = 160;
    const target = processPortrait(
      prepare(c.getContext("2d"), im, settings.edits, 1),
      160,
      portrait,
    );
    im.close();
    putRgb(c.getContext("2d"), target, 160);
    return { pixels: Array.from(target), png: c.toDataURL() };
  }, portrait);
  pixels = new Uint8Array(r.pixels);
  writeFileSync(out + "/target.bin", pixels);
  writeFileSync(
    out + "/target-160.png",
    Buffer.from(r.png.split(",")[1], "base64"),
  );
} finally {
  await browser.close();
}
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
      if (performance.now() - last > 15000) {
        last = performance.now();
        console.log("natural", Math.round(f * 100) + "%");
      }
    },
  },
  {
    edgeWeight: 2,
    sweeps: 8,
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
  referenceHash: control.sequenceHash,
  sequenceHash: i.sequenceHash,
  connections: i.metrics.lines,
  meters: i.metrics.estimatedMeters,
  targetChangedBy:
    "contour-preparation/2; bounded tone-preserving local contrast",
  qualityAcceptance: "open",
  physicalAcceptance: false,
};
const file = {
    schema: "iprasm.project/1",
    project: {
      ...source.project,
      id: crypto.randomUUID(),
      name: "Natural tone and facial detail",
      instruction: i,
      progress: progressFor(i),
    },
    evidence,
  },
  text = JSON.stringify(file, null, 2);
await parseProjectFile(text);
writeFileSync(out + "/candidate-guide.json", text, { flag: "wx" });
writeFileSync(out + "/candidate.json", text, { flag: "wx" });
writeFileSync(out + "/control.json", JSON.stringify(source, null, 2), {
  flag: "wx",
});
writeFileSync(out + "/control-guide.json", JSON.stringify(source, null, 2), {
  flag: "wx",
});
console.log(JSON.stringify(evidence));
