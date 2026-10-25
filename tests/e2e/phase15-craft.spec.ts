import { test, expect } from "./legacy-test";
import { openMore, revealControl } from "./navigation";
import { mkdirSync, readFileSync } from "node:fs";
import { validateGridProject } from "../../src/core/grid-craft";
import { validatePaintProject } from "../../src/core/paint";
import { paintBoundaryPlan } from "../../src/core/paint-boundaries";
async function enter(page: any) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
}
async function fill(page: any, label: string, value: string) {
  const control = page.getByLabel(label, { exact: true });
  await revealControl(control);
  await control.fill(value);
}
async function json(page: any, name: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return JSON.parse(readFileSync((await (await event).path())!, "utf8"));
}
test("diamond physical shape and magnetic materials survive exact exports and offline restart", async ({
  page,
  context,
}, info) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Use original sample", exact: true })
    .click();
  await page.getByLabel("Craft type", { exact: true }).selectOption("diamond");
  for (const [label, value] of [
    ["Grid columns", "12"],
    ["Grid rows", "8"],
    ["Piece width (mm)", "2.2"],
  ])
    await fill(page, label, value);
  await page.getByLabel("Piece shape", { exact: true }).selectOption("square");
  await page
    .getByLabel("Magnetic backing + steel-backed pieces (experimental)", {
      exact: true,
    })
    .check();
  await fill(page, "Magnetic backing thickness (mm)", "0.5");
  await fill(page, "Backing color", "#faf8ef");
  await page
    .getByRole("button", { name: "Create piece guide", exact: true })
    .click();
  await expect(page.getByTestId("diamond-materials")).toContainText(
    "Square · 2.2 mm",
  );
  await page
    .getByRole("button", { name: "Save grid project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm completed through this piece", exact: true })
    .click();
  const p = (await json(page, "Grid JSON")).project;
  await validateGridProject(p);
  expect(p.guide.schema).toBe("iprasm.grid/2");
  expect(p.progress.confirmed).toBe(1);
  expect(p.guide.profile.diamond).toEqual({
    version: "diamond-material/1",
    style: "square",
    sizeMm: 2.2,
    attachment: "magnetic-steel",
    backingMm: 0.5,
    backingHex: "#faf8ef",
  });
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Physical SVG", exact: true }).click();
  const svg = readFileSync((await (await event).path())!, "utf8");
  expect(svg).toContain('width="30mm"');
  expect(svg).toContain("#faf8ef");
  expect(svg).not.toContain("<circle");
  const pixel = await page
    .locator("canvas[data-grid-hash]")
    .evaluate((canvas: HTMLCanvasElement) =>
      Array.from(canvas.getContext("2d")!.getImageData(0, 0, 1, 1).data),
    );
  [250, 248, 239].forEach((channel, i) => expect(Math.abs(pixel[i] - channel)).toBeLessThanOrEqual(2));
  const center = await page.locator("canvas[data-grid-hash]").evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext("2d")!.getImageData(4, 4, 1, 1).data));
  expect(center.slice(0, 3)).toEqual([1, 3, 5].map(i => parseInt(p.guide.profile.palette[p.guide.cells[0]].hex.slice(i, i + 2), 16)));
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Open grid project", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("grid-progress")).toContainText("1/96");
  await expect(page.getByLabel("Piece shape", { exact: true })).toHaveValue(
    "square",
  );
  expect((await json(page, "Grid JSON")).project.guide.sequenceHash).toBe(
    p.guide.sequenceHash,
  );
  const out = `output/current-craft/${info.project.name}`;
  mkdirSync(out, { recursive: true });
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Grid PDF", exact: true }).click();
  await (await pdf).saveAs(out + "/diamond.pdf");
  await page.screenshot({ path: out + "/diamond.png", fullPage: true });
  await context.setOffline(false);
});
test("paint has closed physical contours, exact area coverage and durable offline progress", async ({
  page,
  context,
}, info) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Paint by numbers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use paint sample", exact: true })
    .click();
  await fill(page, "Paint columns", "16");
  await fill(page, "Paint rows", "16");
  await fill(page, "Minimum region (cells)", "4");
  await fill(page, "Cell size (mm)", "10");
  await page
    .getByRole("button", { name: "Create paint guide", exact: true })
    .click();
  await expect(page.getByTestId("paint-boundaries")).toBeVisible();
  await page
    .getByRole("button", { name: "Save paint project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mark region painted", exact: true })
    .click();
  const p = (await json(page, "Paint JSON")).project;
  await validatePaintProject(p);
  const plan = await json(page, "Boundary JSON");
  expect(plan).toEqual(paintBoundaryPlan(p.guide, p.progress.completed));
  await expect(page.getByTestId("paint-area-progress")).toContainText(
    plan.paintedPercent.toFixed(1) + "%",
  );
  for (const r of plan.regions)
    for (const loop of r.loops)
      expect(loop.points[0]).toEqual(loop.points.at(-1));
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Closed boundaries SVG", exact: true })
    .click();
  const svg = readFileSync((await (await dl).path())!, "utf8");
  expect(svg).toContain(p.guide.sequenceHash);
  expect(svg).toContain("50 mm");
  expect(svg).toContain('width="160mm"');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Paint by numbers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open paint project", exact: true })
    .first()
    .click();
  expect(await json(page, "Boundary JSON")).toEqual(plan);
  const out = `output/current-craft/${info.project.name}`;
  mkdirSync(out, { recursive: true });
  await page
    .getByTestId("paint-boundaries")
    .screenshot({ path: out + "/paint-boundaries.png" });
  await context.setOffline(false);
});
