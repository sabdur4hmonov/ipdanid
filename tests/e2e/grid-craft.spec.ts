import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import {
  validateGridProject,
  gridCell,
  gridCounts,
} from "../../src/core/grid-craft";
for (const kind of ["mosaic", "diamond"] as const)
  test(`real ${kind} photo inventory, preview, progress undo, offline exports and separate manual edit`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.getByLabel("Language").selectOption("en");
    await page
      .locator("nav")
      .getByRole("button", { name: "Grid crafts", exact: true })
      .click();
    await page
      .getByLabel("Grid photo", { exact: true })
      .setInputFiles("output/outline/source.jpg");
    await page.getByLabel("Craft type", { exact: true }).selectOption(kind);
    await page.getByLabel("Grid columns", { exact: true }).fill("12");
    await page.getByLabel("Grid rows", { exact: true }).fill("8");
    await page
      .getByRole("button", { name: "Create piece guide", exact: true })
      .click();
    await expect(page.locator("canvas[data-grid-hash]")).toBeVisible();
    const hash = await page
      .locator("canvas[data-grid-hash]")
      .getAttribute("data-grid-hash");
    await page
      .getByRole("button", { name: "Save grid project", exact: true })
      .click();
    await page.getByLabel("Assembly step", { exact: true }).fill("5");
    await page
      .getByRole("button", {
        name: "Confirm completed through this piece",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("grid-progress")).toContainText("5/96");
    await page
      .getByRole("button", { name: "Undo last confirmation", exact: true })
      .click();
    await expect(page.getByTestId("grid-progress")).toContainText("0/96");
    await page.getByLabel("Assembly step", { exact: true }).fill("5");
    await page
      .getByRole("button", {
        name: "Confirm completed through this piece",
        exact: true,
      })
      .click();
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "Grid JSON", exact: true }).click();
    const source = JSON.parse(
      readFileSync((await (await event).path())!, "utf8"),
    ).project;
    await validateGridProject(source);
    expect(source.guide.profile.kind).toBe(kind);
    expect(source.guide.sequenceHash).toBe(hash);
    expect(source.progress.confirmed).toBe(5);
    expect(
      gridCounts(source.guide).every((c) => c.used + c.spares <= c.stock),
    ).toBe(true);
    expect(source.guide.profile.sparePercent).toBe(kind === "diamond" ? 10 : 0);
    const pixels = await page
      .locator("canvas[data-grid-hash]")
      .evaluate((c: HTMLCanvasElement) => {
        const x = c.getContext("2d")!,
          data = [];
        for (let row = 0; row < 8; row++)
          for (let col = 0; col < 12; col++)
            data.push(
              [...x.getImageData(col * 8 + 4, row * 8 + 4, 1, 1).data].slice(
                0,
                3,
              ),
            );
        return data;
      });
    expect(pixels).toEqual(
      source.guide.cells.map((v: number) =>
        [1, 3, 5].map((k) =>
          parseInt(source.guide.profile.palette[v].hex.slice(k, k + 2), 16),
        ),
      ),
    );
    const csvEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Steps CSV", exact: true }).click();
    const csv = readFileSync((await (await csvEvent).path())!, "utf8").split(
      "\n",
    );
    expect(csv).toHaveLength(97);
    csv.slice(1).forEach((s: string, j: number) => {
      const c = gridCell(source.guide, j + 1);
      expect(s.split(",")).toEqual([
        String(j + 1),
        String(c.row),
        String(c.column),
        c.symbol,
        c.color.code,
        c.color.hex,
      ]);
    });
    const svgEvent = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Physical SVG", exact: true })
      .click();
    const svg = readFileSync((await (await svgEvent).path())!, "utf8");
    expect(svg).toContain(`width="${12 * source.guide.profile.pitchMm}mm"`);
    expect(svg).toContain(hash!);
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page
      .locator("nav")
      .getByRole("button", { name: "Grid crafts", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open grid project", exact: true })
      .first()
      .click();
    await expect(page.getByTestId("grid-progress")).toContainText("5/96");
    await expect(page.locator("canvas[data-grid-hash]")).toHaveAttribute(
      "data-grid-hash",
      hash!,
    );
    const pdfEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Grid PDF", exact: true }).click();
    const pdf = await pdfEvent;
    mkdirSync("output/grid", { recursive: true });
    await pdf.saveAs(
      `output/grid/${kind}-${test.info().project.name}-guide.pdf`,
    );
    const jsonEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Grid JSON", exact: true }).click();
    await (
      await jsonEvent
    ).saveAs(`output/grid/${kind}-${test.info().project.name}-guide.json`);
    await page.getByText("Edit current piece", { exact: true }).click();
    const next = gridCell(source.guide, 6),
      newColor =
        (source.guide.cells[next.index] + 1) %
        source.guide.profile.palette.length;
    await page
      .getByLabel("Replacement color", { exact: true })
      .selectOption(String(newColor));
    await page
      .getByRole("button", { name: "Create edited variant", exact: true })
      .click();
    await expect(page.getByTestId("grid-progress")).toContainText("0/96");
    await expect(page.locator("canvas[data-grid-hash]")).not.toHaveAttribute(
      "data-grid-hash",
      hash!,
    );
    await page
      .getByRole("button", { name: "Save grid project", exact: true })
      .click();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("iprasm.grid-projects.v1")!),
    );
    expect(
      stored.find((p: any) => p.guide.sequenceHash === hash).progress.confirmed,
    ).toBe(5);
    expect(stored[0].guide.manualEdit.parentSequenceHash).toBe(hash);
    await page.screenshot({
      path: `output/grid/${kind}-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("insufficient actual stock is refused before a guide is created", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("nav")
    .getByRole("button", { name: "Grid crafts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use original sample", exact: true })
    .click();
  await page
    .getByLabel("Palette and stock", { exact: true })
    .fill("W,#ffffff,1\nB,#000000,1");
  await page
    .getByRole("button", { name: "Create piece guide", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Not enough pieces including spares",
  );
  await expect(page.locator("canvas[data-grid-hash]")).toHaveCount(0);
});

test("two windows reject stale grid confirmations without losing another window progress", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("nav")
    .getByRole("button", { name: "Grid crafts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use original sample", exact: true })
    .click();
  await page.getByLabel("Grid columns", { exact: true }).fill("4");
  await page.getByLabel("Grid rows", { exact: true }).fill("4");
  await page
    .getByRole("button", { name: "Create piece guide", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save grid project", exact: true })
    .click();
  const other = await context.newPage();
  await other.goto("/");
  await other
    .locator("nav")
    .getByRole("button", { name: "Grid crafts", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Open grid project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("grid-progress")).toContainText("0/16");
  await page.getByLabel("Assembly step", { exact: true }).fill("2");
  await page
    .getByRole("button", {
      name: "Confirm completed through this piece",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("grid-progress")).toContainText("2/16");
  await other.getByLabel("Assembly step", { exact: true }).fill("3");
  await other
    .getByRole("button", {
      name: "Confirm completed through this piece",
      exact: true,
    })
    .click();
  await expect(other.getByRole("alert")).toContainText(
    "Progress changed in another window",
  );
  const all = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.grid-projects.v1")!),
  );
  expect(all[0].progress.confirmed).toBe(2);
  expect(all[0].progress.revision).toBe(1);
  await other
    .getByRole("button", { name: "Open grid project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("grid-progress")).toContainText("2/16");
  await other.close();
});
