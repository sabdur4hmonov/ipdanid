import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const name = process.argv[2] ?? "light-protected",
  browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (r) => r.abort());
  await page.goto("http://127.0.0.1:5173");
  const result = await page.evaluate(async (name) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { processPortrait, putRgb } = await import("/src/core/portrait.ts"),
      { hash } = await import("/src/core/engine.ts");
    const setup = await (
        await fetch(`/output/background/${name}-setup.json`)
      ).json(),
      control = await (
        await fetch("/output/background/control-setup.json")
      ).json();
    const img = await loadPhoto(
      new File(
        [await (await fetch("/output/portrait/source.jpg")).blob()],
        "source.jpg",
        { type: "image/jpeg" },
      ),
    );
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const raw = prepare(c.getContext("2d"), img, setup.edits, 1),
      old = processPortrait(raw, 160, control.portrait),
      pixels = processPortrait(raw, 160, setup.portrait);
    if (
      (await hash(pixels)) !== setup.targetHash ||
      (await hash(old)) !== control.targetHash
    )
      throw new Error("Target mismatch");
    const boxes = {
        "left eye": [51, 55, 83, 76],
        "right eye": [87, 55, 119, 76],
        nose: [70, 76, 103, 103],
        mouth: [65, 105, 110, 121],
        jaw: [53, 116, 126, 143],
        "light cheek": [100, 78, 116, 103],
      },
      changed = {};
    for (const [region, [l, t, r, b]] of Object.entries(boxes)) {
      let count = 0;
      for (let y = t; y < b; y++)
        for (let x = l; x < r; x++) {
          const i = (y * 160 + x) * 3;
          if (pixels[i] !== old[i]) count++;
        }
      changed[region] = count;
    }
    putRgb(c.getContext("2d"), pixels, 160);
    return { png: c.toDataURL(), hash: setup.targetHash, changed };
  }, name);
  writeFileSync(
    `output/background/${name}-target-preview.png`,
    Buffer.from(result.png.split(",")[1], "base64"),
  );
  delete result.png;
  writeFileSync(
    `output/background/${name}-preparation-evidence.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
