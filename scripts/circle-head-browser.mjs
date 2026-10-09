import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const folder = "output/circle-head",
  folders = ["circle-head", "circle-head-240", "circle-head-240-clean", "circle-head-240-192"].filter(
    (f) => existsSync(`output/${f}/circle-sequence.png`),
  );
const browser = await chromium.launch({ headless: true }),
  errors = [];
try {
  const report = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
  });
  await report.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  report.on("pageerror", (e) => errors.push(e.message));
  await report.goto("http://127.0.0.1:5183/output/circle-head/report.html");
  await report
    .locator("img")
    .evaluateAll((list) => Promise.all(list.map((im) => im.decode())));
  const exact = await report.evaluate(async (folders) => {
    const { previewPng } = await import("/src/core/preview-png.ts"),
      { rasterSequence, rasterSequenceAtResolution } = await import("/src/core/optical.ts"),
      { regionMeasurements, processPortrait, putRgb } = await import("/src/core/portrait.ts"),
      { validateInstruction } = await import("/src/core/validation.ts");
    const result = [];
    const {loadPhoto,prepare}=await import('/src/core/image.ts'),{remapPortrait}=await import('/src/core/shape-crop.ts');
    const settings=await(await fetch('/output/circle-head-240/circle-settings.json')).json(),photo=await loadPhoto(new File([await(await fetch('/output/outline/source.jpg')).blob()],'source.jpg',{type:'image/jpeg'}));
    const commonN=384,canvas=document.createElement('canvas');canvas.width=canvas.height=commonN;
    const commonPortrait=remapPortrait(settings.portrait,settings.edits,settings.edits,photo.width,photo.height,1,commonN,1,160);
    const canonicalTarget=processPortrait(prepare(canvas.getContext('2d'),photo,settings.edits,1),commonN,commonPortrait);photo.close();putRgb(canvas.getContext('2d'),canonicalTarget,commonN);
    const canonicalTargetPng=canvas.toDataURL();
    for (const folder of folders) {
      const path = "/output/" + folder + "/",
        project = (await (await fetch(path + "circle-guide.json")).json())
          .project,
        i = await validateInstruction(project.instruction),
        raster = rasterSequence(i);
      const sealed = new Float32Array(
        await (await fetch(path + "circle-sequence.f32")).arrayBuffer(),
      );
      if (!raster.every((v, j) => v === sealed[j]))
        throw Error("Sealed raster changed");
      const read = async (blob) => {
        const im = await createImageBitmap(blob),
          c = document.createElement("canvas");
        c.width = c.height = i.params.resolution;
        c.getContext("2d").drawImage(im, 0, 0);
        im.close();
        return c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      };
      const a = await read(new Blob([previewPng(i)], { type: "image/png" })),
        b = await read(
          await (await fetch(path + "circle-sequence.png")).blob(),
        );
      if (!a.every((v, j) => v === b[j]))
        throw Error("Preview differs from full sequence");
      const target = new Uint8Array(
        await (await fetch(path + "circle-target.bin")).arrayBuffer(),
      );
      const commonRaster=rasterSequenceAtResolution(i,commonN);putRgb(canvas.getContext('2d'),Uint8Array.from(commonRaster,v=>Math.round(v*255)),commonN);
      result.push({
        folder,
        sequenceHash: i.sequenceHash,
        exactPreviewPixels: true,
        exactFloatReplay: true,
        commonGrid: {resolution:commonN,canonicalSourceTarget:'same circle240 crop/preprocessing at384; source-relative remapped anatomy',headMetrics:regionMeasurements(canonicalTarget,commonRaster,commonN,i.profile,commonPortrait)},
        commonPng:canvas.toDataURL(),canonicalTargetPng,
        headMetrics: regionMeasurements(
          target,
          raster,
          i.params.resolution,
          i.profile,
          i.params.portrait,
        ),
      });
    }
    return result;
  }, folders);
  for(const entry of exact){writeFileSync(`output/${entry.folder}/circle-common.png`,Buffer.from(entry.commonPng.split(',')[1],'base64'));delete entry.commonPng;writeFileSync(folder+'/common-target.png',Buffer.from(entry.canonicalTargetPng.split(',')[1],'base64'));delete entry.canonicalTargetPng;}
  const projects = [];
  for (const name of folders) {
    const context = await browser.newContext(),
      page = await context.newPage(),
      project = JSON.parse(
        readFileSync(`output/${name}/circle-guide.json`, "utf8"),
      ).project;
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4183/");
    await page.getByLabel("Language").selectOption("en");
    await page
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page
      .locator("input[type=file]")
      .last()
      .setInputFiles(`output/${name}/circle-guide.json`);
    await expect(page.getByTestId("confirmed-step")).toContainText("0/", {
      timeout: 60000,
    });
    await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      project.instruction.sequenceHash,
    );
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
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .click();
    const exported = JSON.parse(
      readFileSync(await (await download).path(), "utf8"),
    ).project;
    expect(exported.instruction).toEqual(project.instruction);
    expect(exported.edits).toEqual(project.edits);
    expect(exported.progress.confirmed).toBe(0);
    projects.push({
      name,
      hash: exported.instruction.sequenceHash,
      offlineReload: true,
      exactExport: true,
      zeroProgress: true,
    });
    await context.close();
  }
  expect(errors).toEqual([]);
  writeFileSync(
    folder + "/browser-evidence.json",
    JSON.stringify({ exact, projects, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      exactPreviews: exact.length,
      offlineProjects: projects.length,
      errors,
    }),
  );
} finally {
  await browser.close();
}
