// Private consented fixture; local packaged models only. Refuse to replace evidence.
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
const out = "output/portrait-detail";
mkdirSync(out, { recursive: true });
for (const f of ["white-source.png", "white-tone.bin", "white-detail.bin"])
  if (existsSync(`${out}/${f}`))
    throw Error(`Preserved fixture already exists: ${f}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  const result = await page.evaluate(async () => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts");
    const { preparePersonPhoto } = await import("/src/photo-prepare.ts");
    const { whiteBackground } = await import("/src/person-background.ts");
    const { processPortrait, putRgb } = await import("/src/core/portrait.ts");
    const image = await loadPhoto(
      new File(
        [await (await fetch("/output/outline/source.jpg")).blob()],
        "source.jpg",
        { type: "image/jpeg" },
      ),
    );
    const settings = await (
      await fetch("/output/circle-head-240/circle-settings.json")
    ).json();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    image.close();
    const analysis = await preparePersonPhoto(
      canvas,
      new AbortController().signal,
    );
    const prepared = whiteBackground(canvas, analysis.mask),
      variants = [];
    for (const detail of [false, true]) {
      const target = document.createElement("canvas");
      target.width = target.height = 160;
      const pixels = processPortrait(
        prepare(target.getContext("2d"), prepared, settings.edits, 1),
        160,
        {
          ...settings.portrait,
          ...(detail ? { detailStyle: "contour-preparation/1" } : {}),
        },
      );
      putRgb(target.getContext("2d"), pixels, 160);
      variants.push({
        detail,
        pixels: Array.from(pixels),
        png: target.toDataURL(),
      });
    }
    return {
      png: prepared.toDataURL(),
      faces: analysis.faces.length,
      variants,
    };
  });
  writeFileSync(
    `${out}/white-source.png`,
    Buffer.from(result.png.split(",")[1], "base64"),
    { flag: "wx" },
  );
  for (const v of result.variants) {
    const name = v.detail ? "white-detail" : "white-tone";
    writeFileSync(`${out}/${name}.bin`, new Uint8Array(v.pixels), {
      flag: "wx",
    });
    writeFileSync(
      `${out}/${name}-target.png`,
      Buffer.from(v.png.split(",")[1], "base64"),
      { flag: "wx" },
    );
  }
  console.log("Original-photo local preparation faces:", result.faces);
} finally {
  await browser.close();
}
