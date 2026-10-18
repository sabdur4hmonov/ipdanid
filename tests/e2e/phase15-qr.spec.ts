import { test, expect } from "./legacy-test";
import { openMore } from "./navigation";
import jsQR from "jsqr";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  validateQrCraft,
  qrCraftCsv,
  qrCraftSvg,
} from "../../src/core/qr-craft";
import { PDFDocument } from "pdf-lib";
async function enter(page: any) {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", {
      name: "QR ribbon craft (experimental)",
      exact: true,
    })
    .click();
}
async function exported(page: any, name: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return await event;
}
test("real QR front ribbon decodes and the same continuous plan exports, resumes and works offline", async ({
  page,
  context,
}, info) => {
  await enter(page);
  const payload =
    info.project.name === "desktop" ? "https://example.com/gift" : "Salom Мир";
  await page.getByLabel("QR text or link", { exact: true }).fill(payload);
  await page
    .getByRole("button", { name: "Create QR plan", exact: true })
    .click();
  const preview = page.locator("canvas[data-qr-hash]");
  await expect(preview).toBeVisible();
  const pixels = await preview.evaluate((c: HTMLCanvasElement) =>
    Array.from(c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data),
  );
  const capture = `output/current-qr/diagnostic-${info.project.name}`;
  mkdirSync(capture, { recursive: true });
  const png = await preview.evaluate(
    (c: HTMLCanvasElement) => c.toDataURL("image/png").split(",")[1],
  );
  writeFileSync(capture + "/canvas.png", Buffer.from(png, "base64"));
  writeFileSync(capture + "/canvas.rgba", Buffer.from(pixels));
  expect(jsQR(Uint8ClampedArray.from(pixels), 1000, 1000)?.data).toBe(payload);
  const raw = JSON.parse(
      readFileSync(
        (await (await exported(page, "QR project JSON")).path())!,
        "utf8",
      ),
    ),
    g = raw.project.guide;
  await validateQrCraft(g);
  expect(await preview.getAttribute("data-qr-hash")).toBe(g.sequenceHash);
  expect(
    readFileSync(
      (await (await exported(page, "QR steps CSV")).path())!,
      "utf8",
    ),
  ).toBe(qrCraftCsv(g));
  expect(
    readFileSync(
      (await (await exported(page, "QR ribbon SVG")).path())!,
      "utf8",
    ),
  ).toBe(qrCraftSvg(g));
  const template = readFileSync(
    (await (await exported(page, "Hole template SVG")).path())!,
    "utf8",
  );
  expect(template).toBe(qrCraftSvg(g, true));
  expect(template).toContain("50 mm");
  await page.getByLabel("Step", { exact: true }).fill("2");
  await expect(page.getByTestId("qr-current")).toContainText("P2 → P3 · Back");
  await page
    .getByRole("button", { name: "Confirm through this step", exact: true })
    .click();
  await expect(page.getByTestId("qr-progress")).toContainText("2/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await enter(page);
  await page
    .getByRole("button", { name: "Open QR project", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("qr-progress")).toContainText("2/");
  await expect(page.getByTestId("qr-current")).toContainText("P3 → P4 · Front");
  const pdf = await exported(page, "QR template and steps PDF"),
    out = `output/current-qr/${info.project.name}`;
  mkdirSync(out, { recursive: true });
  await pdf.saveAs(out + "/qr.pdf");
  writeFileSync(out + "/guide.json", JSON.stringify(raw));
  const doc = await PDFDocument.load(readFileSync(out + "/qr.pdf"));
  expect(doc.getSubject()).toBe(g.sequenceHash);
  expect(doc.getPages()[1].getWidth()).toBeCloseTo(
    ((g.widthMm + 20) * 72) / 25.4,
  );
  await preview.screenshot({ path: out + "/front.png" });
  await page.screenshot({ path: out + "/screen.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Back", { exact: true }).check();
  await preview.screenshot({ path: out + "/back.png" });
  await context.setOffline(false);
});
test("QR payload/import limits and stale-window progress/delete guards preserve the valid plan", async ({
  page,
  context,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Create QR plan", exact: true })
    .click();
  const hash = await page
    .locator("canvas[data-qr-hash]")
    .getAttribute("data-qr-hash");
  const other = await context.newPage();
  await enter(other);
  await other
    .getByRole("button", { name: "Open QR project", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm through this step", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Confirm through this step", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText(
    "Progress changed in another window",
  );
  await other
    .getByRole("button", { name: "Delete QR project", exact: true })
    .first()
    .click();
  await expect(other.getByRole("alert")).toContainText("Progress changed");
  await other.reload();
  await openMore(other);
  await other.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await other
    .getByRole("button", {
      name: "QR ribbon craft (experimental)",
      exact: true,
    })
    .click();
  await other
    .getByRole("button", { name: "Open QR project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("qr-progress")).toContainText("1/");
  const raw = JSON.parse(
    readFileSync(
      (await (await exported(page, "QR project JSON")).path())!,
      "utf8",
    ),
  );
  raw.project.guide.moves[1].side = "front";
  await page
    .getByLabel("Import QR project", { exact: true })
    .setInputFiles({
      name: "forged.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(raw)),
    });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("canvas[data-qr-hash]")).toHaveAttribute(
    "data-qr-hash",
    hash!,
  );
  await page
    .getByLabel("QR text or link", { exact: true })
    .fill("x".repeat(60));
  await page
    .getByRole("button", { name: "Create QR plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("canvas[data-qr-hash]")).toHaveAttribute(
    "data-qr-hash",
    hash!,
  );
  await other.close();
});
