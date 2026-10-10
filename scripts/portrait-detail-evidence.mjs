import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const white = process.argv.includes("--white");
const natural = process.argv.includes("--natural");
const out = natural
    ? "output/portrait-detail/natural"
    : white
      ? "output/portrait-detail/white"
      : "output/portrait-detail",
  browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  const rows = ["control", "candidate"].map((name) => ({
    name,
    instruction: JSON.parse(readFileSync(`${out}/${name}.json`, "utf8")).project
      .instruction,
  }));
  const result = await page.evaluate(
    async ({ rows, white }) => {
      const { prepare, loadPhoto } = await import("/src/core/image.ts"),
        { processPortrait, putRgb, regionMeasurements, portraitRegions } =
          await import("/src/core/portrait.ts"),
        { remapPortrait } = await import("/src/core/shape-crop.ts"),
        { rasterSequenceAtResolution } = await import("/src/core/optical.ts"),
        { hash } = await import("/src/core/engine.ts");
      const settings = await (
          await fetch("/output/circle-head-240/circle-settings.json")
        ).json(),
        im = await loadPhoto(
          new File(
            [
              await (
                await fetch(
                  white
                    ? "/output/portrait-detail/white-source.png"
                    : "/output/outline/source.jpg",
                )
              ).blob(),
            ],
            "source.jpg",
            { type: white ? "image/png" : "image/jpeg" },
          ),
        );
      const results = [];
      for (const n of [160, 512]) {
        const c = document.createElement("canvas");
        c.width = c.height = n;
        const portrait = remapPortrait(
            settings.portrait,
            settings.edits,
            settings.edits,
            im.width,
            im.height,
            1,
            n,
            1,
            160,
          ),
          rgb = prepare(c.getContext("2d"), im, settings.edits, 1),
          originalTarget = processPortrait(rgb, n, portrait),
          detailTarget = processPortrait(rgb, n, {
            ...portrait,
            detailStyle: rows[1].instruction.params.portrait.detailStyle,
          });
        const targetHash = await hash(originalTarget),
          detailHash = await hash(detailTarget);
        if (
          n === 160 &&
          (targetHash !== rows[0].instruction.imageHash ||
            detailHash !== rows[1].instruction.imageHash)
        )
          throw Error("Source-derived target replay mismatch");
        putRgb(c.getContext("2d"), originalTarget, n);
        const originalPng = c.toDataURL();
        putRgb(c.getContext("2d"), detailTarget, n);
        const detailPng = c.toDataURL(),
          variants = [];
        const correlations = (target, raster) => {
          const values = {};
          for (const key of ["eyes", "nose", "mouth", "face"]) {
            const r = portraitRegions(portrait)[key];
            let aa = 0,
              bb = 0,
              ab = 0;
            for (
              let y = Math.ceil(r.top * (n - 1));
              y < Math.floor((r.top + r.height) * (n - 1));
              y++
            )
              for (
                let x = Math.ceil(r.left * (n - 1));
                x < Math.floor((r.left + r.width) * (n - 1));
                x++
              )
                for (const d of [1, n]) {
                  const i = y * n + x,
                    a = (target[(i + d) * 3] - target[i * 3]) / 255,
                    b = raster[(i + d) * 3] - raster[i * 3];
                  aa += a * a;
                  bb += b * b;
                  ab += a * b;
                }
            values[key] = aa && bb ? ab / Math.sqrt(aa * bb) : 0;
          }
          return values;
        };
        for (const { name, instruction: i } of rows) {
          const raster = rasterSequenceAtResolution(i, n);
          putRgb(
            c.getContext("2d"),
            Uint8Array.from(raster, (v) => Math.round(v * 255)),
            n,
          );
          variants.push({
            name,
            originalTargetErrors: regionMeasurements(
              originalTarget,
              raster,
              n,
              i.profile,
              portrait,
            ),
            detailTargetErrors: regionMeasurements(
              detailTarget,
              raster,
              n,
              i.profile,
              portrait,
            ),
            sourceContourCosine: correlations(originalTarget, raster),
            png: c.toDataURL(),
          });
        }
        results.push({
          resolution: n,
          targetHash,
          detailHash,
          originalPng,
          detailPng,
          variants,
        });
      }
      im.close();
      return results;
    },
    { rows, white: white || natural },
  );
  for (const row of result) {
    for (const [key, name] of [
      ["originalPng", "original-target"],
      ["detailPng", "detail-target"],
    ]) {
      writeFileSync(
        `${out}/${name}-${row.resolution}.png`,
        Buffer.from(row[key].split(",")[1], "base64"),
      );
      delete row[key];
    }
    for (const v of row.variants) {
      writeFileSync(
        `${out}/${v.name}-${row.resolution}.png`,
        Buffer.from(v.png.split(",")[1], "base64"),
      );
      delete v.png;
    }
  }
  writeFileSync(`${out}/comparison.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      result.map((r) => ({
        resolution: r.resolution,
        contours: r.variants.map((v) => ({
          name: v.name,
          correlation: v.sourceContourCosine,
        })),
      })),
    ),
  );
} finally {
  await browser.close();
}
