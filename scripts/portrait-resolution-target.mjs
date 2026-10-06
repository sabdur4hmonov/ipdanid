import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const folder = "output/resolution";
mkdirSync(folder, { recursive: true });
const audit = JSON.parse(readFileSync("output/regions/audit.json", "utf8"));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (r) => r.abort());
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async (audit) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts");
    const { processPortrait, putRgb } = await import("/src/core/portrait.ts");
    const { regionPixels } = await import("/src/core/coordinates.ts");
    const { hash } = await import("/src/core/engine.ts");
    const blob = await (await fetch("/output/portrait/source.jpg")).blob();
    if (
      (await hash(new Uint8Array(await blob.arrayBuffer()))) !==
      audit.sourceHash
    )
      throw Error("Wrong original");
    const image = await loadPhoto(
      new File([blob], "source.jpg", { type: "image/jpeg" }),
    );
    const stages = {};
    for (const n of [160, 192]) {
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const raw = prepare(c.getContext("2d"), image, audit.edits, 1);
      const crop = c.toDataURL();
      const pixels = processPortrait(raw, n, audit.portrait);
      putRgb(c.getContext("2d"), pixels, n);
      stages[n] = {
        crop,
        target: c.toDataURL(),
        pixels: [...pixels],
        targetHash: await hash(pixels),
        crops: Object.fromEntries(
          Object.entries(audit.portrait.regions)
            .filter(([k]) => k !== "reference")
            .map(([k, b]) => [k, regionPixels(b, n)]),
        ),
      };
    }
    image.close();
    if (stages[160].targetHash !== audit.targetHash)
      throw Error("160 pipeline no longer reproduces");
    return stages;
  }, audit);
  const s = result[192];
  const save = (p, b) => {
    if (existsSync(p)) {
      if (!readFileSync(p).equals(b))
        throw Error("Existing evidence differs: " + p);
    } else writeFileSync(p, b, { flag: "wx" });
  };
  for (const k of ["crop", "target"])
    save(`${folder}/${k}.png`, Buffer.from(s[k].split(",")[1], "base64"));
  save(`${folder}/target.bin`, Buffer.from(s.pixels));
  save(
    `${folder}/target-audit.json`,
    Buffer.from(
      JSON.stringify(
        {
          sourceHash: audit.sourceHash,
          edits: audit.edits,
          portrait: audit.portrait,
          targetHash: s.targetHash,
          crops: s.crops,
          resolution: 192,
          reproduced160TargetHash: result[160].targetHash,
          directOriginalPreprocessing: true,
        },
        null,
        2,
      ),
    ),
  );
  console.log(
    JSON.stringify({
      targetHash: s.targetHash,
      crops: s.crops,
      reproduced160: result[160].targetHash,
    }),
  );
} finally {
  await browser.close();
}
