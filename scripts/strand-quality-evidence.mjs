// Local exact-source reconstruction. Framing differences are recorded, never hidden.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const folder = process.argv[2];
if (
  ![
    "integer-strands",
    "integer-snapshot",
    "face-focus",
    "thread-fineness",
    "thread-fineness-025",
    "portrait-resolved",
  ].includes(folder)
)
  throw Error("Select a known local experiment");
const out = "output/" + folder;
const rows = (folder === "portrait-resolved" ? ["control", "candidate-4", "candidate", "candidate-pruned"] : ["control", "candidate"]).map((name) => ({
  name,
  project: JSON.parse(readFileSync(`${out}/${name}.json`, "utf8")).project,
}));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  const results = await page.evaluate(async ({ rows, folder }) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts");
    const { processPortrait, putRgb, regionMeasurements, portraitRegions } =
      await import("/src/core/portrait.ts");
    const { remapPortrait } = await import("/src/core/shape-crop.ts");
    const { rasterSequenceAtResolution } = await import("/src/core/optical.ts");
    const { regionPixels } = await import("/src/core/coordinates.ts");
    const { hash } = await import("/src/core/engine.ts");
    const { qualityDifferences, withinQualityTolerance } = await import("/src/core/simplify.ts");
    const image = await loadPhoto(
      new File(
        [
          await (
            await fetch("/output/portrait-detail/white-source.png")
          ).blob(),
        ],
        "source.png",
        { type: "image/png" },
      ),
    );
    const results = [];
    for (const n of (folder === "portrait-resolved" ? [160, 320, 512] : [160, 512])) {
      const variants = [];
      let referenceRaster, controlRaster;
      for (const { name, project } of rows) {
        const i = project.instruction,
          edits = project.edits;
        if (!edits) throw Error("Missing exact source edits");
        const portrait = remapPortrait(
          i.params.portrait,
          edits,
          edits,
          image.width,
          image.height,
          1,
          n,
          1,
          i.params.resolution,
        );
        const c = document.createElement("canvas");
        c.width = c.height = n;
        const pixels = processPortrait(
          prepare(c.getContext("2d"), image, edits, 1),
          n,
          portrait,
        );
        const targetHash = await hash(pixels);
        if (n === i.params.resolution && targetHash !== i.imageHash)
          throw Error("Exact target mismatch: " + name);
        putRgb(c.getContext("2d"), pixels, n);
        const targetPng = c.toDataURL();
        const target = Float32Array.from(pixels, (v) => v / 255),
          raster = rasterSequenceAtResolution(i, n);
        if (name === "control") controlRaster = raster;
        if (name === "candidate") referenceRaster = raster;
        const qualityAgainstControl = folder === "portrait-resolved" && name !== "control" ? qualityDifferences(controlRaster, raster, pixels, n, { ...i, params: { ...i.params, portrait } }) : undefined;
        const simplificationDifferences = name === "candidate-pruned" ? qualityDifferences(referenceRaster, raster, pixels, n, { ...i, params: { ...i.params, portrait } }) : undefined;
        putRgb(
          c.getContext("2d"),
          Uint8Array.from(raster, (v) => Math.round(v * 255)),
          n,
        );
        const png = c.toDataURL(),
          regions = portraitRegions(portrait),
          crops = {},
          contourCosine = {};
        for (const key of ["eyes", "nose", "mouth", "face"]) {
          const bounds = regionPixels(regions[key], n);
          let ab = 0,
            aa = 0,
            bb = 0;
          for (
            let y = Math.max(1, bounds.top);
            y <= Math.min(n - 2, bounds.bottom);
            y++
          )
            for (
              let x = Math.max(1, bounds.left);
              x <= Math.min(n - 2, bounds.right);
              x++
            )
              for (const offset of [1, n]) {
                const k = (y * n + x) * 3,
                  d = offset * 3;
                const a = (target[k + d] - target[k - d]) * 0.5,
                  b = (raster[k + d] - raster[k - d]) * 0.5;
                ab += a * b;
                aa += a * a;
                bb += b * b;
              }
          contourCosine[key] = aa && bb ? ab / Math.sqrt(aa * bb) : 0;
          const crop = document.createElement("canvas");
          crop.width = bounds.right - bounds.left + 1;
          crop.height = bounds.bottom - bounds.top + 1;
          crop
            .getContext("2d")
            .drawImage(
              c,
              bounds.left,
              bounds.top,
              crop.width,
              crop.height,
              0,
              0,
              crop.width,
              crop.height,
            );
          crops[key] = crop.toDataURL();
        }
        variants.push({
          name,
          qualityAgainstControl,
          simplificationDifferences,
          simplificationWithinTolerance: simplificationDifferences ? withinQualityTolerance(simplificationDifferences) : undefined,
          targetHash,
          errors: regionMeasurements(pixels, raster, n, i.profile, portrait),
          contourCosine,
          png,
          targetPng,
          crops,
        });
      }
      results.push({ resolution: n, variants });
    }
    image.close();
    return results;
  }, { rows, folder });
  for (const row of results)
    for (const v of row.variants) {
      for (const [field, suffix] of [
        ["png", ""],
        ["targetPng", "-target"],
      ]) {
        writeFileSync(
          `${out}/${v.name}${suffix}-${row.resolution}.png`,
          Buffer.from(v[field].split(",")[1], "base64"),
        );
        delete v[field];
      }
      for (const [key, png] of Object.entries(v.crops))
        writeFileSync(
          `${out}/${v.name}-${key}-${row.resolution}.png`,
          Buffer.from(png.split(",")[1], "base64"),
        );
      delete v.crops;
    }
  const evidence = {
    framingChanged:
      JSON.stringify(rows[0].project.edits) !==
      JSON.stringify(rows[1].project.edits),
    originalTonePreserved: !rows.some(
      (r) => r.project.instruction.params.portrait.detailStyle,
    ),
    physicalAcceptance: false,
    results,
  };
  writeFileSync(`${out}/comparison.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
