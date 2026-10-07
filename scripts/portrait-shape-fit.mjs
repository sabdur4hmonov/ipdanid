import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const folder = "output/shape-fit";
mkdirSync(folder, { recursive: true });
const audit = JSON.parse(
  readFileSync("output/resolution/target-audit.json", "utf8"),
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const data = await page.evaluate(async (audit) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { processPortrait, putRgb } = await import("/src/core/portrait.ts"),
      { fitMarkedFace, remapPortrait } =
        await import("/src/core/shape-crop.ts"),
      { createProfile } = await import("/src/core/geometry.ts"),
      { hash } = await import("/src/core/engine.ts");
    const blob = await (await fetch("/output/portrait/source.jpg")).blob();
    if (
      (await hash(new Uint8Array(await blob.arrayBuffer()))) !==
      audit.sourceHash
    )
      throw Error("Wrong original source");
    const image = await loadPhoto(
        new File([blob], "source.jpg", { type: "image/jpeg" }),
      ),
      n = 192;
    const fit = fitMarkedFace(
        "heart",
        audit.portrait.face,
        audit.edits,
        1,
        400,
        400,
        n,
      ),
      after = remapPortrait(
        audit.portrait,
        audit.edits,
        fit.edits,
        image.width,
        image.height,
        1,
        n,
      );
    const profile = {
      ...(await (await fetch("/output/contrast/physical-2.json")).json())
        .instruction.profile,
      ...{
        shape: "heart",
        pins: createProfile("heart", 160).pins,
        id: "dev-heart-160-dark",
      },
    };
    const stages = {};
    for (const [name, edits, portrait] of [
      ["before", audit.edits, audit.portrait],
      ["after", fit.edits, after],
    ]) {
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const raw = prepare(c.getContext("2d"), image, edits, 1),
        crop = c.toDataURL(),
        pixels = processPortrait(raw, n, portrait);
      putRgb(c.getContext("2d"), pixels, n);
      stages[name] = {
        edits,
        portrait,
        crop,
        target: c.toDataURL(),
        pixels: [...pixels],
        targetHash: await hash(pixels),
      };
    }
    image.close();
    return {
      sourceHash: audit.sourceHash,
      source: "same original local photograph; never result screenshot",
      profile,
      resolution: n,
      layoutExperiment:
        "separate heart160; heart240 rejected by unchanged 1.6 mm spacing requirement; not a change to any saved circle board",
      fit,
      stages,
    };
  }, audit);
  for (const [name, s] of Object.entries(data.stages)) {
    for (const key of ["crop", "target"])
      writeFileSync(
        `${folder}/${name}-${key}.png`,
        Buffer.from(s[key].split(",")[1], "base64"),
      );
    writeFileSync(`${folder}/${name}-target.bin`, Buffer.from(s.pixels));
    delete s.crop;
    delete s.target;
    delete s.pixels;
  }
  if (existsSync(folder + "/audit.json")) {
    if (
      JSON.stringify(JSON.parse(readFileSync(folder + "/audit.json"))) !==
      JSON.stringify(data)
    )
      throw Error("Sealed crop audit differs");
  } else writeFileSync(folder + "/audit.json", JSON.stringify(data, null, 2));
  console.log(
    JSON.stringify({
      fit: data.fit,
      sourceHash: data.sourceHash,
      targets: Object.fromEntries(
        Object.entries(data.stages).map(([k, s]) => [k, s.targetHash]),
      ),
    }),
  );
} finally {
  await browser.close();
}
