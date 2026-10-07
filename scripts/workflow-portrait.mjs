// Local product-flow evidence. Source stays local; no API credentials or POSTs.
import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const folder = "output/workflow";
mkdirSync(folder, { recursive: true });
const source = "output/portrait/source.jpg";
if (
  createHash("sha256").update(readFileSync(source)).digest("hex") !==
  "b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4"
)
  throw Error("Wrong source");
if (existsSync(folder + "/portrait-guide.json"))
  throw Error("Preserve completed product-flow experiment");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("http://127.0.0.1:5173/");
  await page.getByLabel("Language").selectOption("en");
  await page.locator("input[type=file]").first().setInputFiles(source);
  await expect(page.getByTestId("shape-crop")).toBeVisible();
  await page.getByRole("button", { name: "Heart", exact: true }).click();
  // Explicitly NEW board/material variant. Existing user presets are never loaded/modified.
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Number of pins", { exact: true }).fill("160");
  await page.getByLabel("Thread thickness (mm)", { exact: true }).fill("0.1");
  await page.getByLabel("Available thread (m)", { exact: true }).fill("600");
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page
    .getByLabel("Portrait optimization", { exact: true })
    .selectOption("physical");
  const audit = JSON.parse(
    readFileSync("output/resolution/target-audit.json", "utf8"),
  );
  const portrait = await page.evaluate(async (audit) => {
    const { remapPortrait } = await import("/src/core/shape-crop.ts");
    const im = await createImageBitmap(
      await (await fetch("/output/portrait/source.jpg")).blob(),
    );
    // Normalize via the original 192 sample centers, then map through source into 160.
    const { targetToSource, sourceToTarget } =
      await import("/src/core/coordinates.ts");
    const map = (b) => {
      const a = targetToSource(
        b.left,
        b.top,
        im.width,
        im.height,
        audit.edits,
        1,
        192,
      );
      const z = targetToSource(
        b.left + b.width,
        b.top + b.height,
        im.width,
        im.height,
        audit.edits,
        1,
        192,
      );
      const e = {
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        brightness: 0,
        contrast: 1,
      };
      const p = sourceToTarget(a.x, a.y, im.width, im.height, e, 1, 160),
        q = sourceToTarget(z.x, z.y, im.width, im.height, e, 1, 160);
      return { left: p.x, top: p.y, width: q.x - p.x, height: q.y - p.y };
    };
    const s = {
      ...audit.portrait,
      face: map(audit.portrait.face),
      regions: {
        ...audit.portrait.regions,
        placement: "manual",
        eyes: map(audit.portrait.regions.eyes),
        nose: map(audit.portrait.regions.nose),
        mouth: map(audit.portrait.regions.mouth),
      },
    };
    im.close();
    return s;
  }, audit);
  // Head sliders are UI-bounded; use the nearest legal step and retain actual values.
  for (const [key, val] of Object.entries(portrait.face))
    await page
      .getByLabel("Face region " + key[0].toUpperCase() + key.slice(1), {
        exact: true,
      })
      .fill(String(Math.round(val * 100) / 100));
  await page.getByLabel("Simplify background", { exact: true }).fill("0.85");
  await page.getByLabel("Local contrast", { exact: true }).fill("0.5");
  for (const name of ["Eyes", "Nose", "Mouth"]) {
    await page.getByRole("button", { name, exact: true }).click();
    for (const [key, val] of Object.entries(
      portrait.regions[name.toLowerCase()],
    ))
      await page
        .getByLabel(name + " " + key[0].toUpperCase() + key.slice(1), {
          exact: true,
        })
        .fill(val.toFixed(5));
  }
  await page
    .getByTestId("shape-crop")
    .screenshot({ path: folder + "/source-crop.png" });
  await page
    .getByTestId("region-editor")
    .screenshot({ path: folder + "/target-regions.png" });
  const started = Date.now();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  // Honest observed stage updates, no completion ETA.
  const progress = setInterval(async () => {
    try {
      console.log(
        JSON.stringify({
          elapsedSeconds: (Date.now() - started) / 1000,
          fraction: await page
            .locator("progress")
            .first()
            .getAttribute("value", { timeout: 1000 }),
        }),
      );
    } catch {}
  }, 15000);
  try {
    await expect(
      page.getByRole("button", { name: "Save & assemble", exact: true }),
    ).toBeVisible({ timeout: 600000 });
  } finally {
    clearInterval(progress);
  }
  const elapsedMs = Date.now() - started;
  await page
    .locator(".result-card")
    .screenshot({ path: folder + "/portrait-result.png" });
  const hash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .getByLabel("Project name", { exact: true })
    .fill("NEW 160-pin heart / 0.1 mm · product-flow diagnostic");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(hash);
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  // Dev server intentionally has no SW. Seal the completed guide before moving
  // to the production build to test its genuine pre-cached offline exports.
  const sealed = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  await (await sealed).saveAs(folder + "/portrait-guide.json");
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Language").selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles(folder + "/portrait-guide.json");
  await expect(page.getByTestId("player-hash")).toHaveText(hash, {
    timeout: 60000,
  });
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  for (const [button, filename] of [
    ["Project JSON", "portrait-guide.json"],
    ["TXT sequence", "portrait-guide.txt"],
    ["Preview PNG", "portrait-preview.png"],
    ["PDF guide", "portrait-guide.pdf"],
  ]) {
    const d = page.waitForEvent("download");
    await page
      .getByRole("button", { name: button, exact: true })
      .first()
      .click();
    await (await d).saveAs(folder + "/" + filename);
  }
  const project = JSON.parse(
    readFileSync(folder + "/portrait-guide.json", "utf8"),
  ).project;
  if (
    project.instruction.sequenceHash !== hash ||
    project.progress.confirmed !== 0
  )
    throw Error("Sequence/progress mismatch");
  await page.context().setOffline(false);
  await page.goto("http://127.0.0.1:5173/");
  const check = await page.evaluate(async (project) => {
    const { validateInstruction, toTxt } =
      await import("/src/core/validation.ts");
    const { Distribution } = await import("/src/core/distribution.ts");
    const i = await validateInstruction(project.instruction);
    return {
      valid: true,
      txt: toTxt(i),
      distribution: {
        maxRepeat: Math.max(
          ...new Distribution(i.profile.pins.length, i.segments).pairs.values(),
        ),
        maxIncident: Math.max(
          ...new Distribution(i.profile.pins.length, i.segments).degree,
        ),
      },
    };
  }, project);
  if (check.txt !== readFileSync(folder + "/portrait-guide.txt", "utf8"))
    throw Error("TXT mismatch");
  writeFileSync(
    folder + "/product-evidence.json",
    JSON.stringify(
      {
        elapsedMs,
        hash,
        profile: project.instruction.profile,
        params: project.instruction.params,
        metrics: project.instruction.metrics,
        distribution: check.distribution,
        offlineExports: true,
        zeroProgress: true,
        errors,
        physicalValidated: false,
        deviceTested: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      elapsedMs,
      hash,
      metrics: project.instruction.metrics,
      errors,
    }),
  );
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
