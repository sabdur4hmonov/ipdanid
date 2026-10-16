import { test, expect } from "./standard-expert-test";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
test.use({ serviceWorkers: "block" });
test("uploaded photo is visible immediately with collapsed tools and survives replacement and locale changes", async ({
  page,
}, info) => {
  await page.route("**/vendor/portrait-segmentation/**", (r) => r.abort());
  await page.goto("/");
  const studio = page.getByTestId("standard-kit-studio");
  const image = async (colour: string) =>
    page.evaluate((colour) => {
      const c = document.createElement("canvas");
      c.width = 160;
      c.height = 120;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 160, 120);
      return c.toDataURL("image/png").split(",")[1];
    }, colour);
  for (const [name, colour, rgb] of [
    ["first", "rgb(20,40,60)", [20, 40, 60]],
    ["replacement", "rgb(180,80,30)", [180, 80, 30]],
  ] as const) {
    await studio
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: name + ".png",
        mimeType: "image/png",
        buffer: Buffer.from(await image(colour), "base64"),
      });
    const preview = studio.getByTestId("standard-photo-preview");
    await expect(preview).toBeVisible();
    await expect(studio.getByTestId("background-status")).toBeVisible();
    await expect(studio.getByTestId("background-status")).toHaveAttribute(
      "data-status",
      "failed",
      { timeout: 60000 },
    );
    expect(
      await preview.evaluate((c: HTMLCanvasElement) => [
        c.width,
        c.height,
        ...c.getContext("2d")!.getImageData(80, 60, 1, 1).data,
      ]),
    ).toEqual([160, 120, ...rgb, 255]);
    // Neither face-box nor brush details needs opening to see the actual photo.
    expect(await studio.locator("details[open]").count()).toBe(0);
    for (const [locale, label] of [
      ["uz", "Yuklangan surat"],
      ["uz-Cyrl", "Юкланган сурат"],
      ["ru", "Загруженное фото"],
      ["en", "Uploaded photo"],
    ]) {
      await page.getByLabel("Language", { exact: true }).selectOption(locale);
      await expect(preview).toHaveAttribute("aria-label", label);
      await expect(preview).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.getByLabel("Language", { exact: true }).selectOption("uz");
  await studio.getByTestId("standard-photo-preview").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("uploaded-photo-visible.png"),
    fullPage: true,
  });
});
for (const shape of ["circle", "rectangle", "heart"] as const)
  test(`default standard ${shape} kit prepares reviewed real pixels, runs classic Worker and unlocks exact saved guide`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(180000);
    await page.route("**/vendor/portrait-segmentation/**", (r) => r.abort());
    await page.goto("/");
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    const studio = page.getByTestId("standard-kit-studio");
    await expect(studio).toBeVisible();
    await studio
      .locator("summary")
      .filter({ hasText: "Revision printed on your kit" })
      .click();
    await studio
      .getByLabel("Revision printed on your kit", { exact: true })
      .fill("1");
    await studio
      .getByRole("button", {
        name: "Use this printed kit revision",
        exact: true,
      })
      .click();
    await expect(studio).toContainText("r1");
    await studio.getByLabel("Kit shape", { exact: true }).selectOption(shape);
    if (shape === "heart")
      await studio
        .getByRole("checkbox", {
          name: "Optional second-colour heart border",
          exact: true,
        })
        .check();
    const png = await page.evaluate((shape) => {
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const x = c.getContext("2d")!;
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, 160, 160);
      x.fillStyle = "#999999";
      x.beginPath();
      x.ellipse(
        shape === "heart" ? 50 : 80,
        64,
        shape === "heart" ? 20 : 30,
        43,
        0,
        0,
        7,
      );
      x.fill();
      if (shape === "heart") {
        x.beginPath();
        x.ellipse(112, 64, 20, 43, 0, 0, 7);
        x.fill();
      }
      x.fillStyle = "#222222";
      x.fillRect(64, 53, 8, 4);
      x.fillRect(89, 53, 8, 4);
      x.fillRect(77, 67, 5, 12);
      x.fillRect(70, 87, 20, 3);
      return c.toDataURL("image/png").split(",")[1];
    }, shape);
    await studio
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "procedural-face.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
    await expect(studio.getByTestId("background-status")).toHaveAttribute(
      "data-status",
      "failed",
      { timeout: 60000 },
    );
    await studio
      .locator("summary")
      .filter({ hasText: "Source face boxes" })
      .click();
    await studio
      .getByRole("button", { name: "Add a real face box", exact: true })
      .click();
    if (shape === "heart") {
      await studio
        .getByRole("button", { name: "Add a real face box", exact: true })
        .click();
      for (const [j, left] of [
        [1, 0.15],
        [2, 0.54],
      ]) {
        await studio
          .getByLabel(`Face ${j} left`, { exact: true })
          .fill(String(left));
        await studio
          .getByLabel(`Face ${j} width`, { exact: true })
          .fill("0.32");
        await studio
          .getByLabel(`Face ${j} height`, { exact: true })
          .fill("0.60");
      }
      await expect(
        studio.getByRole("button", {
          name: "Add a real face box",
          exact: true,
        }),
      ).toBeDisabled();
    }
    await studio
      .locator("summary")
      .filter({ hasText: "Maximum connections" })
      .click();
    await studio.getByLabel("Maximum connections", { exact: true }).fill("120");
    await studio
      .getByLabel("Computation resolution", { exact: true })
      .selectOption("64");
    await studio
      .getByRole("button", { name: "Prepare face-fill crop", exact: true })
      .click();
    const review = studio.getByRole("checkbox", {
      name: "I checked every face, the white background and crop",
      exact: true,
    });
    await expect(
      studio.getByRole("button", {
        name: "Calculate standard guide",
        exact: true,
      }),
    ).toBeDisabled();
    await review.check();
    await studio
      .getByRole("button", { name: "Calculate standard guide", exact: true })
      .click();
    await expect(
      studio.getByRole("button", { name: "Save and assemble", exact: true }),
    ).toBeVisible({ timeout: 120000 });
    await page.screenshot({
      path: info.outputPath("standard-kit.png"),
      fullPage: true,
    });
    await studio
      .getByRole("button", { name: "Save and assemble", exact: true })
      .click();
    await expect(page.getByTestId("build-gate")).toBeVisible();
    await expect(page.getByTestId("player-hash")).toHaveCount(0);
    await unlockKitGuide(page);
    await expect(page.getByTestId("player-hash")).toBeVisible();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .last()
      .click();
    const download = await pending;
    const i = JSON.parse(readFileSync((await download.path())!, "utf8")).project
      .instruction;
    writeFileSync(info.outputPath("standard-guide.json"), JSON.stringify(i));
    await validateInstruction(i);
    expect(i.algorithm).toBe(
      shape === "heart" ? "standard-accent/21" : "classic-greedy/2",
    );
    expect(i.profile.pins).toHaveLength(240);
    if (shape === "circle")
      expect(i.profile.pins[0].y * 500).toBeCloseTo(20, 8);
    expect(i.profile.shape).toBe(shape);
    expect(i.profile.threadMm).toBe(0.12);
    expect(i.profile.pins[76].sectorLabel).toBe("B-17");
    expect(i.params.kitPreparation.transform.faces).toHaveLength(
      shape === "heart" ? 2 : 1,
    );
    expect(i.metrics.lines).toBeGreaterThan(0);
    const pdfDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "PDF guide", exact: true })
      .last()
      .click();
    copyFileSync(
      (await (await pdfDownload).path())!,
      info.outputPath("standard-guide.pdf"),
    );
    const txtDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "TXT sequence", exact: true })
      .last()
      .click();
    const txt = readFileSync((await (await txtDownload).path())!, "utf8");
    expect(txt).toContain(i.profile.pins[i.segments[0].path[0]].sectorLabel);
    expect(JSON.parse(txt.split("\n")[1])).toEqual(i);
    await context.setOffline(true);
    await expect(page.getByTestId("player-hash")).toBeVisible();
  });
test("printed kit revision survives admin defaults and offline missing revisions cannot silently substitute", async ({
  page,
  context,
}) => {
  const base = process.env.IP_RASM_TEST_API_URL!,
    headers = { Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN}` };
  const config = await (
    await page.request.get(base + "/api/kit-profiles")
  ).json();
  const saved = await page.request.post(base + "/api/admin/kits/profiles", {
    headers,
    data: { ...config, sectors: 8 },
  });
  expect(saved.ok()).toBe(true);
  const revision = (await saved.json()).revision;
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  const studio = page.getByTestId("standard-kit-studio");
  await expect(studio).toContainText(`r${revision}`);
  await studio
    .locator("summary")
    .filter({ hasText: "Revision printed on your kit" })
    .click();
  await studio
    .getByLabel("Revision printed on your kit", { exact: true })
    .fill("1");
  await studio
    .getByRole("button", { name: "Use this printed kit revision", exact: true })
    .click();
  await expect(studio).toContainText("r1");
  await context.setOffline(true);
  await studio
    .getByLabel("Revision printed on your kit", { exact: true })
    .fill("99999");
  await studio
    .getByRole("button", { name: "Use this printed kit revision", exact: true })
    .click();
  await expect(studio.getByRole("alert")).toBeVisible();
  await expect(studio).toContainText("r1");
});
