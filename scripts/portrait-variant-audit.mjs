import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const folder = "output/regions";
mkdirSync(folder, { recursive: true });
if (existsSync(`${folder}/website-variants.json`))
  throw new Error("Preserve existing website audit");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173");
  const transforms = await page.evaluate(async () => {
    const { prepare } = await import("/src/core/image.ts"),
      { DEFAULT_EDITS } = await import("/src/core/types.ts"),
      { sourceToTarget } = await import("/src/core/coordinates.ts");
    const source = document.createElement("canvas");
    source.width = 320;
    source.height = 400;
    const ctx = source.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 320, 400);
    ctx.fillStyle = "red";
    ctx.fillRect(156, 196, 8, 8);
    const target = document.createElement("canvas");
    target.width = target.height = 160;
    const records = [];
    for (const aspect of [0.75, 1, 1.5])
      for (const rotation of [-35, 0, 90]) {
        const edits = {
          ...DEFAULT_EDITS,
          zoom: 1.3,
          panX: 0.08,
          panY: -0.04,
          rotation,
        };
        const pixels = prepare(target.getContext("2d"), source, edits, aspect);
        let weight = 0,
          x = 0,
          y = 0;
        for (let k = 0; k < 160 ** 2; k++) {
          const w = Math.max(0, pixels[k * 3] - pixels[k * 3 + 1]);
          weight += w;
          x += w * (k % 160);
          y += w * Math.floor(k / 160);
        }
        const predicted = sourceToTarget(160, 200, 320, 400, edits, aspect);
        const errorPixels = Math.hypot(
          x / weight - predicted.x * 159,
          y / weight - predicted.y * 159,
        );
        if (errorPixels > 0.35)
          throw new Error(`Canvas transform disagrees: ${errorPixels}`);
        records.push({
          aspect,
          edits,
          predicted,
          measured: { x: x / weight / 159, y: y / weight / 159 },
          errorPixels,
        });
      }
    return records;
  });
  writeFileSync(
    `${folder}/canvas-transforms.json`,
    JSON.stringify(transforms, null, 2),
  );
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles("output/portrait/source.jpg");
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page.screenshot({
    path: `${folder}/website-estimated-regions.png`,
    fullPage: true,
  });
  const variants = [];
  for (const name of ["Balanced", "Detailed"]) {
    await page
      .locator(".preset-row")
      .getByRole("button", { name, exact: true })
      .click();
    const requested = await page
      .getByLabel("Maximum lines", { exact: true })
      .inputValue();
    await page
      .getByRole("button", { name: "Calculate thread path", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cancel", exact: true })
      .waitFor({ state: "hidden", timeout: 240000 });
    const displayedHash = await page
      .locator("canvas[data-sequence-hash]")
      .getAttribute("data-sequence-hash");
    const canvas = await page
      .locator("canvas[data-sequence-hash]")
      .evaluate((c) => c.toDataURL());
    await page
      .getByRole("button", { name: "Save & assemble", exact: true })
      .click();
    const event = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .click();
    const guide = JSON.parse(readFileSync(await (await event).path(), "utf8"));
    if (guide.project.instruction.sequenceHash !== displayedHash)
      throw new Error("Preview/export mismatch");
    writeFileSync(
      `${folder}/website-${name.toLowerCase()}-guide.json`,
      JSON.stringify(guide, null, 2),
    );
    variants.push({
      name,
      requested: Number(requested),
      instruction: guide.project.instruction,
      edits: guide.project.edits,
      confirmed: guide.project.progress.confirmed,
      canvasHash: createHash("sha256").update(canvas).digest("hex"),
      pathHash: createHash("sha256")
        .update(JSON.stringify(guide.project.instruction.segments))
        .digest("hex"),
    });
    await page
      .locator("nav")
      .getByRole("button", { name: "Create", exact: true })
      .click();
  }
  const evidence = {
    note: "Actual website flow, unchanged default crop/120 pins/.3mm, continuous solver with proportional estimates; separate from the 240-pin experiment. Screenshots alone do not identify old saved variant metadata.",
    variants,
    samePhysicalPath: variants[0].pathHash === variants[1].pathHash,
    sameCanvas: variants[0].canvasHash === variants[1].canvasHash,
    browser: await browser.version(),
  };
  writeFileSync(
    `${folder}/website-variants.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    JSON.stringify({
      samePhysicalPath: evidence.samePhysicalPath,
      sameCanvas: evidence.sameCanvas,
      variants: variants.map((v) => ({
        name: v.name,
        requested: v.requested,
        count: v.instruction.metrics.lines,
        meters: v.instruction.metrics.estimatedMeters,
        reason: v.instruction.metrics.stoppedReason,
        hash: v.instruction.sequenceHash,
        target: v.instruction.imageHash,
      })),
    }),
  );
} finally {
  await browser.close();
}
