import { newEvidenceRoot } from "../helpers/evidence-paths";
import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, platform, arch, totalmem } from "node:os";
import { readFileSync } from "node:fs";
test("actual worker generation, explicit confirmation, reload, offline import/PDF and bounded layout", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180000); // Full offline export/re-import sometimes exceeds 90 s on this host.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  // Exercise the actual validated PNG photo-upload path, using an original test fixture.
  const png = await page
    .getByLabel("Edited photo", { exact: true })
    .screenshot();
  await page.locator("input[type=file]").first().setInputFiles({
    name: "original-illustration.png",
    mimeType: "image/png",
    buffer: png,
  });
  await revealControl(page.getByRole("button", { name: "Lighter", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Lighter", exact: true }).click();
  const start = Date.now();
  await page.getByRole("button", { name: "Calculate thread path" }).click();
  await expect(
    page.getByRole("button", { name: "Save & assemble" }),
  ).toBeVisible({ timeout: 60000 });
  const generationMs = Date.now() - start;
  mkdirSync("output/evidence", { recursive: true });
  await page.screenshot({
    path: newEvidenceRoot(`output/evidence/${testInfo.project.name}-generated.png`),
    fullPage: true,
  });
  await page.locator(".result-card").screenshot({
    path: newEvidenceRoot(`output/evidence/${testInfo.project.name}-quality-result.png`),
  });
  const previewHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await revealControl(page.getByLabel("Project name", { exact: true }));
  await page.getByLabel("Project name", { exact: true }).fill("Verified original sample");
  await page.getByRole("button", { name: "Save & assemble" }).click();
  await unlockIfNeeded(page);
  await expect(page.getByTestId("player-hash")).toHaveText(previewHash!);
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  await page
    .getByRole("button", { name: "Confirm completed through this step" })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("2/");
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toContainText("2/");
  await page.getByLabel("Jump to exact step").fill("10");
  await expect(page.getByTestId("confirmed-step")).toContainText("2/");
  await page.getByLabel("Find a pin number").fill("0");
  await expect(page.locator(".occurrences button").first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toContainText("2/");
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "PDF guide", exact: true })
      .first()
      .click(),
  ]);
  mkdirSync("output/evidence", { recursive: true });
  await pdf.saveAs(newEvidenceRoot(`output/evidence/${testInfo.project.name}-guide.pdf`));
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Project JSON", exact: true }).click(),
  ]);
  const path = await json.path();
  const exported = JSON.parse(readFileSync(path!, "utf8"));
  // R1's explicit whole-image path uses the guarded solver; legacy /4 imports
  // remain covered by their pinned compatibility tests.
  expect(exported.project.instruction.algorithm).toBe("continuous-guarded/6");
  expect(exported.project.instruction.params.resolution).toBe(160);
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.locator("input[type=file]").last().setInputFiles(path!);
  await expect(page.getByTestId("player-hash")).toHaveText(previewHash!);
  await page.screenshot({
    path: newEvidenceRoot(`output/evidence/${testInfo.project.name}-assembly.png`),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await context.setOffline(false);
  await page
    .getByRole("button", { name: "Create", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: newEvidenceRoot(`output/evidence/${testInfo.project.name}-create.png`),
    fullPage: true,
  });
  await testInfo.attach("generation-measurement", {
    body: JSON.stringify({
      generationMs,
      resolution: 160,
      pins: 120,
      maxLines: 700,
      profile: "dev-circle-120-dark",
      emulatedViewport: testInfo.project.name,
    }),
    contentType: "application/json",
  });
  writeFileSync(
    newEvidenceRoot(`output/evidence/${testInfo.project.name}-benchmark.json`),
    JSON.stringify(
      {
        generationMs,
        input: "Original test illustration via PNG upload",
        resolution: 160,
        pins: 120,
        maxLines: 700,
        viewport: testInfo.project.name,
        host: {
          platform: platform(),
          arch: arch(),
          cpu: cpus()[0]?.model,
          ramGiB: Math.round(totalmem() / 1024 ** 3),
          node: process.version,
          browser: await context.browser()?.version(),
        },
        deviceTest: false,
        modestPhysicalDeviceBenchmark: false,
      },
      null,
      2,
    ),
  );
  // A second tab changes the same library. Stale progress must not overwrite it.
  await page.getByRole("button", { name: "Assemble", exact: true }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "My projects", exact: true }).click();
  await other
    .getByRole("button", { name: "Resume", exact: true })
    .first()
    .click();
  await other
    .getByRole("button", { name: "Confirm completed through this step" })
    .click();
  await expect(other.getByTestId("confirmed-step")).toContainText("3/");
  await page
    .getByRole("button", { name: "Confirm completed through this step" })
    .click();
  await expect(
    page.getByRole("button", { name: "Reload saved library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm completed through this step" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Reload saved library" }).click();
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("3/");
  await other.close();
});

test("rectangular material dimensions drive crop, worker, preview and multicolor assembly", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByRole("button", { name: "Rectangle", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByLabel("Thread and base").selectOption("color");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Height (mm)", { exact: true }));
  await page.getByLabel("Height (mm)", { exact: true }).fill("300");
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await revealControl(page.getByRole("button", { name: "Lighter", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Lighter", exact: true }).click();
  await page.getByRole("button", { name: "Calculate thread path" }).click();
  await expect(
    page.getByRole("button", { name: "Save & assemble" }),
  ).toBeVisible({ timeout: 60000 });
  const canvas = page.locator("canvas[data-sequence-hash]");
  expect(await canvas.getAttribute("height")).toBe("540");
  await page.getByRole("button", { name: "Save & assemble" }).click();
  await unlockIfNeeded(page);
  const bounds = await page.locator(".craft-canvas").boundingBox();
  expect(bounds!.width / bounds!.height).toBeCloseTo(4 / 3, 1);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.projects.v1")!),
  );
  expect(saved[0].instruction.profile.heightMm).toBe(300);
  expect(saved[0].instruction.segments.length).toBeGreaterThan(1);
  expect(saved[0].progress.confirmed).toBe(0);
});

test("photo candidates retain edits and reusable settings persist without storing photos", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  const png = await page
    .getByLabel("Edited photo", { exact: true })
    .screenshot();
  await revealControl(page.getByLabel("Brightness", { exact: true }));
  await page.getByLabel("Brightness", { exact: true }).fill("25");
  await page.locator("input[type=file]").first().setInputFiles({
    name: "second-photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await revealControl(page.getByLabel("Brightness", { exact: true }));
  await page.getByLabel("Brightness", { exact: true }).fill("-20");
  await revealControl(page.getByTestId("advanced-photo").getByRole("button", { name: "Try an original sample", exact: true, includeHidden: true }));
  await page.getByTestId("advanced-photo")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await expect(page.getByLabel("Brightness", { exact: true })).toHaveValue(
    "25",
  );
  await page
    .getByRole("button", { name: "second-photo.png", exact: true })
    .click();
  await expect(page.getByLabel("Brightness", { exact: true })).toHaveValue(
    "-20",
  );
  await revealControl(page.getByRole("button", { name: "Rectangle", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Height (mm)", { exact: true }));
  await page.getByLabel("Height (mm)", { exact: true }).fill("300");
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await revealControl(page.getByRole("button", { name: "Lighter", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Lighter", exact: true }).click();
  await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
  await page.locator("summary").filter({ hasText: "Saved settings" }).click();
  await revealControl(page.getByLabel("Settings name", { exact: true }));
  await page.getByLabel("Settings name", { exact: true }).fill("Small rectangular board");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.locator(".alert.success")).toHaveText("Settings saved");
  await page.reload();
  await expect(page.getByRole("button", { name: "Upload from gallery", exact: true })).toBeVisible();
  await openMore(page);
  await page.locator(".more-menu").getByRole("button", { name: "Try an original sample", exact: true }).click();
  await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
  await page.locator("summary").filter({ hasText: "Saved settings" }).click();
  await revealControl(page.getByLabel("Saved settings", { exact: true }));
  await page.getByLabel("Saved settings", { exact: true }).selectOption({ label: "Small rectangular board" });
  // Crop is specific to a new source and starts at default; material settings still persist.
  await revealControl(page.getByLabel("Brightness", { exact: true }));
  await page.getByLabel("Brightness", { exact: true }).fill("-20");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Preview PNG", exact: true }).click(),
  ]);
  const bytes = readFileSync((await download.path())!);
  expect(bytes.readUInt32BE(16)).toBe(1024);
  expect(bytes.readUInt32BE(20)).toBe(768);
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  await expect(page.getByLabel("Brightness", { exact: true })).toHaveValue(
    "-20",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.projects.v1")!),
  );
  expect(saved[0].progress.confirmed).toBe(0);
  expect(saved[0].instruction.profile.heightMm).toBe(300);
});
