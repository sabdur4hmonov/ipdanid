import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const out = "output/contour",
  names = ["weight-2", "weight-4"];
const browser = await chromium.launch({ headless: true }),
  errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  const evaluation = await page.evaluate(async (names) => {
    const { validateInstruction, toTxt } =
        await import("/src/core/validation.ts"),
      { rasterSequence, rasterSequenceAtResolution } =
        await import("/src/core/optical.ts"),
      { previewPng } = await import("/src/core/preview-png.ts"),
      { exportPdf } = await import("/src/core/pdf.ts"),
      { processPortrait, regionMeasurements, putRgb } =
        await import("/src/core/portrait.ts"),
      { prepare, loadPhoto } = await import("/src/core/image.ts"),
      { remapPortrait } = await import("/src/core/shape-crop.ts");
    const settings = await (
      await fetch("/output/circle-head-240/circle-settings.json")
    ).json();
    const image = await loadPhoto(
        new File(
          [await (await fetch("/output/outline/source.jpg")).blob()],
          "source.jpg",
          { type: "image/jpeg" },
        ),
      ),
      n = 384,
      c = document.createElement("canvas");
    c.width = c.height = n;
    const portrait = remapPortrait(
        settings.portrait,
        settings.edits,
        settings.edits,
        image.width,
        image.height,
        1,
        n,
        1,
        160,
      ),
      target = processPortrait(
        prepare(c.getContext("2d"), image, settings.edits, 1),
        n,
        portrait,
      );
    image.close();
    putRgb(c.getContext("2d"), target, n);
    const targetPng = c.toDataURL(),
      rows = [];
    const reference = (
      await (await fetch("/output/circle-head-240/circle-guide.json")).json()
    ).project.instruction;
    for (const name of ["reference", ...names]) {
      const project =
          name === "reference"
            ? { instruction: reference }
            : (await (await fetch(`/output/contour/${name}.json`)).json())
                .project,
        i = await validateInstruction(project.instruction),
        r = rasterSequence(i);
      if (name !== "reference") {
        const sealed = new Float32Array(
          await (await fetch(`/output/contour/${name}.f32`)).arrayBuffer(),
        );
        if (!r.every((v, k) => v === sealed[k]))
          throw Error("Float replay differs");
      }
      const common = rasterSequenceAtResolution(i, n);
      putRgb(
        c.getContext("2d"),
        Uint8Array.from(common, (v) => Math.round(v * 255)),
        n,
      );
      const preview = previewPng(i),
        bitmap = await createImageBitmap(
          new Blob([preview], { type: "image/png" }),
        ),
        nativeCanvas = document.createElement("canvas");
      nativeCanvas.width = nativeCanvas.height = i.params.resolution;
      nativeCanvas.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close();
      const rgba = nativeCanvas
        .getContext("2d")
        .getImageData(0, 0, i.params.resolution, i.params.resolution).data;
      if (
        !r.every(
          (v, k) =>
            Math.round(v * 255) === rgba[Math.floor(k / 3) * 4 + (k % 3)],
        )
      )
        throw Error("Preview pixels differ");
      rows.push({
        name,
        sequenceHash: i.sequenceHash,
        connections: i.metrics.lines,
        meters: i.metrics.estimatedMeters,
        nativeResolution: i.params.resolution,
        exactPreview: true,
        exactFloatReplay: true,
        commonResolution: n,
        regions: regionMeasurements(target, common, n, i.profile, portrait),
        nativePng: Array.from(preview),
        commonPng: c.toDataURL(),
        pdf:
          name === "reference"
            ? null
            : Array.from(await exportPdf(i, "en", { confirmed: 0 })),
        txt: toTxt(i),
      });
    }
    return { rows, targetPng };
  }, names);
  writeFileSync(
    `${out}/common-target.png`,
    Buffer.from(evaluation.targetPng.split(",")[1], "base64"),
  );
  delete evaluation.targetPng;
  for (const row of evaluation.rows) {
    writeFileSync(`${out}/${row.name}-native.png`, Buffer.from(row.nativePng));
    delete row.nativePng;
    writeFileSync(
      `${out}/${row.name}-common.png`,
      Buffer.from(row.commonPng.split(",")[1], "base64"),
    );
    delete row.commonPng;
    if (row.pdf) {
      if (!existsSync(`${out}/${row.name}-guide.pdf`))
        writeFileSync(`${out}/${row.name}-guide.pdf`, Buffer.from(row.pdf), {
          flag: "wx",
        });
    }
    delete row.pdf;
    if (row.name !== "reference") {
      writeFileSync(`${out}/${row.name}-guide.txt`, row.txt);
      writeFileSync(
        `${out}/${row.name}-guide.json`,
        JSON.stringify(
          {
            schema: "iprasm.project/1",
            project: JSON.parse(readFileSync(`${out}/${row.name}.json`, "utf8"))
              .project,
          },
          null,
          2,
        ),
      );
    }
    delete row.txt;
  }
  const projects = [];
  for (const name of names) {
    const project = JSON.parse(
        readFileSync(`${out}/${name}-guide.json`, "utf8"),
      ).project,
      context = await browser.newContext(),
      p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:4183/");
    await p.getByLabel("Language").selectOption("en");
    await p
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await p
      .locator("input[type=file]")
      .last()
      .setInputFiles(`${out}/${name}-guide.json`);
    await expect(p.getByTestId("confirmed-step")).toContainText("0/");
    await expect(p.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      project.instruction.sequenceHash,
    );
    await p.evaluate(async () => navigator.serviceWorker.ready);
    await p.reload();
    await context.setOffline(true);
    await p.reload();
    await p
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Resume", exact: true })
      .first()
      .click();
    await expect(p.getByTestId("player-hash")).toContainText(
      project.instruction.sequenceHash,
    );
    const wait = p.waitForEvent("download");
    await p.getByRole("button", { name: "Project JSON", exact: true }).click();
    const exported = JSON.parse(
      readFileSync(await (await wait).path(), "utf8"),
    ).project;
    expect(exported.instruction).toEqual(project.instruction);
    expect(exported.edits).toEqual(project.edits);
    expect(exported.progress.confirmed).toBe(0);
    projects.push({
      name,
      hash: project.instruction.sequenceHash,
      offlineReload: true,
      exactExport: true,
      zeroProgress: true,
    });
    await context.close();
  }
  expect(errors).toEqual([]);
  writeFileSync(
    `${out}/evaluation.json`,
    JSON.stringify(
      {
        ...evaluation,
        projects,
        errors,
        physicalAcceptance: false,
        qualityAcceptance: "open",
        canonicalTarget:
          "same source/crop/preprocessing at384; source-remapped manual anatomy; actual strands only",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      exactPreviews: evaluation.rows.length,
      offlineProjects: projects.length,
      errors,
      commonMetrics: evaluation.rows.map((r) => ({
        name: r.name,
        regions: r.regions,
      })),
    }),
  );
} finally {
  await browser.close();
}
