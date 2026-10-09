import { chromium, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
try {
  const p = await browser.newPage();
  await p.goto("http://127.0.0.1:4183/");
  await p.getByLabel("Language").selectOption("en");
  await p
    .locator("nav")
    .getByRole("button", { name: "Grid crafts", exact: true })
    .click();
  const rows = [];
  for (const kind of ["mosaic", "diamond"]) {
    await p
      .getByLabel("Grid photo", { exact: true })
      .setInputFiles("output/outline/source.jpg");
    await p.getByLabel("Craft type", { exact: true }).selectOption(kind);
    await p.getByLabel("Grid columns", { exact: true }).fill("48");
    await p.getByLabel("Grid rows", { exact: true }).fill("64");
    await p
      .getByRole("button", { name: "Create piece guide", exact: true })
      .click();
    await expect(p.getByTestId("grid-progress")).toContainText("0/3072");
    const png = await p
      .locator("canvas[data-grid-hash]")
      .evaluate((c) => ({ png: c.toDataURL(), hash: c.dataset.gridHash }));
    writeFileSync(
      `output/grid/${kind}-48x64.png`,
      Buffer.from(png.png.split(",")[1], "base64"),
    );
    const event = p.waitForEvent("download");
    await p.getByRole("button", { name: "Grid JSON", exact: true }).click();
    await (await event).saveAs(`output/grid/${kind}-48x64.json`);
    rows.push({
      kind,
      hash: png.hash,
      cells: 3072,
      progress: 0,
      actualAssignedPieces: true,
      physicalAcceptance: false,
    });
  }
  writeFileSync(
    "output/grid/owner-evidence.json",
    JSON.stringify(rows, null, 2),
  );
} finally {
  await browser.close();
}
