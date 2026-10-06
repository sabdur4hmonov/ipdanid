// Local reproduction only. Records hashes/settings, never uploads source pixels.
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("output/contrast", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ ...devices["Pixel 7"] });
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async () => {
    const { sampleCanvas, prepare, loadPhoto } =
      await import("/src/core/image.ts");
    const { DEFAULT_PORTRAIT, snapshotPortrait, processPortrait } =
      await import("/src/core/portrait.ts");
    const { DEFAULT_EDITS } = await import("/src/core/types.ts");
    const { hash } = await import("/src/core/engine.ts");
    const p = snapshotPortrait({
      ...DEFAULT_PORTRAIT,
      enabled: true,
      face: { ...DEFAULT_PORTRAIT.face, top: 0.2 },
    });
    const sources = [["sample", sampleCanvas()]];
    const file = await (await fetch("/output/portrait/source.jpg")).blob();
    const photograph = await loadPhoto(
      new File([file], "portrait.jpg", { type: "image/jpeg" }),
    );
    sources.push(["photograph", photograph]);
    const checks = [];
    for (const [name, image] of sources) {
      const source = document.createElement("canvas");
      source.width = image.width;
      source.height = image.height;
      source.getContext("2d").drawImage(image, 0, 0);
      for (const n of [160, 192]) {
        const persistent = document.createElement("canvas");
        persistent.width = persistent.height = n;
        for (let k = 0; k < 12; k++) {
          // The UI target reuses a canvas, whereas continuation originally creates a fresh one.
          const fresh = document.createElement("canvas");
          fresh.width = fresh.height = n;
          const cpu = document.createElement("canvas");
          cpu.width = cpu.height = n;
          const a = processPortrait(
            prepare(persistent.getContext("2d"), source, DEFAULT_EDITS),
            n,
            p,
          );
          const b = processPortrait(
            prepare(fresh.getContext("2d"), source, DEFAULT_EDITS),
            n,
            p,
          );
          const c = processPortrait(
            prepare(
              cpu.getContext("2d", { willReadFrequently: true }),
              source,
              DEFAULT_EDITS,
            ),
            n,
            p,
          );
          let differingAB = 0,
            differingBC = 0;
          for (let j = 0; j < a.length; j++) {
            differingAB += +(a[j] !== b[j]);
            differingBC += +(b[j] !== c[j]);
          }
          checks.push({
            name,
            n,
            iteration: k,
            persistentHash: await hash(a),
            freshHash: await hash(b),
            cpuHash: await hash(c),
            differingAB,
            differingBC,
          });
        }
      }
    }
    photograph.close();
    return checks;
  });
  writeFileSync(
    "output/contrast/continuation-canvas-audit.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      checks: result.length,
      different: result.filter((x) => x.differingAB || x.differingBC),
    }),
  );
} finally {
  await browser.close();
}
