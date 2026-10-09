// A separately disclosed crop; pixel errors across different crops are not a likeness ranking.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const folder = "output/circle-head-240-face",
  project = JSON.parse(
    readFileSync(`${folder}/circle-guide.json`, "utf8"),
  ).project;
const browser = await chromium.launch({ headless: true }),
  errors = [];
try {
  const p = await browser.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await p.goto("http://127.0.0.1:5183/");
  const e = await p.evaluate(async (project) => {
    const { validateInstruction } = await import("/src/core/validation.ts"),
      { rasterSequence, rasterSequenceAtResolution } =
        await import("/src/core/optical.ts"),
      { previewPng } = await import("/src/core/preview-png.ts"),
      { regionMeasurements, processPortrait, putRgb } =
        await import("/src/core/portrait.ts"),
      { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { remapPortrait } = await import("/src/core/shape-crop.ts"),
      { targetToSource } = await import("/src/core/coordinates.ts"),
      { portraitSampling } = await import("/src/core/portrait-sampling.ts");
    const i = await validateInstruction(project.instruction),
      r = rasterSequence(i),
      n = i.params.resolution;
    const sealed = new Float32Array(
      await (
        await fetch("/output/circle-head-240-face/circle-sequence.f32")
      ).arrayBuffer(),
    );
    if (!r.every((v, k) => v === sealed[k]))
      throw Error("Float replay mismatch");
    const settings = await (
      await fetch("/output/circle-head-240/circle-settings.json")
    ).json();
    const source = await loadPhoto(
      new File(
        [await (await fetch("/output/outline/source.jpg")).blob()],
        "source.jpg",
        { type: "image/jpeg" },
      ),
    );
    let cornerChecks = 0;
    for (const key of ["eyes", "nose", "mouth"])
      for (const corner of [0, 1]) {
        const a = settings.portrait.regions[key],
          b = i.params.portrait.regions[key];
        const old = targetToSource(
            a.left + corner * a.width,
            a.top + corner * a.height,
            source.width,
            source.height,
            settings.edits,
            1,
            160,
          ),
          next = targetToSource(
            b.left + corner * b.width,
            b.top + corner * b.height,
            source.width,
            source.height,
            project.edits,
            1,
            n,
          );
        if (Math.max(Math.abs(old.x - next.x), Math.abs(old.y - next.y)) > 1e-7)
          throw Error("Source anatomy drift");
        cornerChecks++;
      }
    const target = new Uint8Array(
      await (
        await fetch("/output/circle-head-240-face/circle-target.bin")
      ).arrayBuffer(),
    );
    const c = document.createElement("canvas");
    c.width = c.height = 384;
    const portrait = remapPortrait(
        i.params.portrait,
        project.edits,
        project.edits,
        source.width,
        source.height,
        1,
        384,
        1,
        n,
      ),
      commonTarget = processPortrait(
        prepare(c.getContext("2d"), source, project.edits, 1),
        384,
        portrait,
      );
    source.close();
    const common = rasterSequenceAtResolution(i, 384);
    putRgb(
      c.getContext("2d"),
      Uint8Array.from(common, (v) => Math.round(v * 255)),
      384,
    );
    const preview = previewPng(i),
      bitmap = await createImageBitmap(
        new Blob([preview], { type: "image/png" }),
      ),
      nc = document.createElement("canvas");
    nc.width = nc.height = n;
    nc.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close();
    const rgba = nc.getContext("2d").getImageData(0, 0, n, n).data;
    if (
      !r.every(
        (v, k) => Math.round(v * 255) === rgba[Math.floor(k / 3) * 4 + (k % 3)],
      )
    )
      throw Error("Preview mismatch");
    return {
      sequenceHash: i.sequenceHash,
      exactFloatReplay: true,
      exactPreviewPixels: true,
      sourceCornerChecks: cornerChecks,
      sampling: portraitSampling(target, n, i.profile.shape, i.params.portrait),
      nativeMetrics: regionMeasurements(
        target,
        r,
        n,
        i.profile,
        i.params.portrait,
      ),
      commonMetrics: regionMeasurements(
        commonTarget,
        common,
        384,
        i.profile,
        portrait,
      ),
      nativePng: Array.from(preview),
      commonPng: c.toDataURL(),
      physicalAcceptance: false,
      qualityAcceptance: "open; hair crop is explicit",
    };
  }, project);
  writeFileSync(`${folder}/circle-sequence.png`, Buffer.from(e.nativePng));
  delete e.nativePng;
  writeFileSync(
    `${folder}/circle-common.png`,
    Buffer.from(e.commonPng.split(",")[1], "base64"),
  );
  delete e.commonPng;
  const context = await browser.newContext(),
    page = await context.newPage();
  page.on("pageerror", (er) => errors.push(er.message));
  await page.goto("http://127.0.0.1:4183/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles(`${folder}/circle-guide.json`);
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("player-hash")).toContainText(
    project.instruction.sequenceHash,
  );
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const exported = JSON.parse(
    readFileSync(await (await wait).path(), "utf8"),
  ).project;
  expect(exported.instruction).toEqual(project.instruction);
  expect(exported.edits).toEqual(project.edits);
  expect(exported.progress.confirmed).toBe(0);
  await context.close();
  expect(errors).toEqual([]);
  writeFileSync(
    `${folder}/browser-evidence.json`,
    JSON.stringify(
      { ...e, offlineReload: true, exactExport: true, progress: 0, errors },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(e));
} finally {
  await browser.close();
}
