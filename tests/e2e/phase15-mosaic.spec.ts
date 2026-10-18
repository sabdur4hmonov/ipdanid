import { test, expect } from "./legacy-test";
import { openMore, revealControl } from "./navigation";
import { readFileSync, mkdirSync } from "node:fs";
import { mosaicPlan } from "../../src/core/mosaic-plan";
import { validateGridProject } from "../../src/core/grid-craft";
import { PDFDocument } from "pdf-lib";
test("mosaic baseplates use real inventory, exact sequence, local positions and offline exports", async ({
  page,
  context,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByLabel("Grid photo", { exact: true })
    .setInputFiles("tests/fixtures/orientation-6.jpg");
  for (const [label, value] of [
    ["Grid columns", "12"],
    ["Grid rows", "8"],
    ["Baseplate width (pieces)", "4"],
    ["Baseplate height (pieces)", "4"],
    ["Baseplates in stock", "5"],
  ]) {
    await revealControl(page.getByLabel(label, { exact: true }));
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page
    .getByRole("button", { name: "24-color example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create piece guide", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Invalid baseplate");
  await expect(page.getByTestId("mosaic-plan")).toHaveCount(0);
  await page.getByLabel("Baseplates in stock", { exact: true }).fill("6");
  await page
    .getByRole("button", { name: "Create piece guide", exact: true })
    .click();
  await expect(page.getByTestId("mosaic-plan")).toContainText("6/6");
  await expect(page.getByTestId("mosaic-current")).toContainText(
    "Baseplate A1",
  );
  await page
    .getByRole("button", { name: "Save grid project", exact: true })
    .click();
  await revealControl(page.getByLabel("Assembly step", { exact: true }));
  await page.getByLabel("Assembly step", { exact: true }).fill("14");
  await page
    .getByRole("button", {
      name: "Confirm completed through this piece",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("mosaic-current")).toContainText("A3 · 2, 2");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Grid JSON", exact: true }).click();
  const raw = JSON.parse(readFileSync((await (await dl).path())!, "utf8"));
  expect(raw.schema).toBe("iprasm.grid-project/2");
  const p = raw.project;
  await validateGridProject(p);
  expect(p.guide.profile.palette).toHaveLength(24);
  expect(p.progress.confirmed).toBe(14);
  const planDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baseplate JSON", exact: true })
    .click();
  expect(
    JSON.parse(readFileSync((await (await planDownload).path())!, "utf8")),
  ).toEqual(mosaicPlan(p));
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
  await expect(page.getByTestId("grid-progress")).toContainText("14/96");
  await expect(page.getByTestId("mosaic-current")).toContainText("A3 · 2, 2");
  const pdfDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baseplate PDF", exact: true })
    .click();
  const pdf = await pdfDownload;
  const path = `output/current-mosaic/${info.project.name}`;
  mkdirSync(path, { recursive: true });
  await pdf.saveAs(path + "/baseplates.pdf");
  const doc = await PDFDocument.load(readFileSync(path + "/baseplates.pdf"));
  expect(doc.getPageCount()).toBe(8);
  expect(doc.getSubject()).toContain(p.layout.hash);
  await page
    .getByTestId("mosaic-plan")
    .screenshot({ path: path + "/baseplates.png" });
  await context.setOffline(false);
});
