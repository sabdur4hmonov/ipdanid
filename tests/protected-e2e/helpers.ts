import { expect, type Page } from "@playwright/test";
export async function english(page: Page) {
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
  await page.getByTestId("locale-picker").selectOption("en");
  await menu.locator("summary").click();
}
export async function choosePhoto(page: Page, syntheticOnly = false) {
  let input: string | { name: string; mimeType: string; buffer: Buffer } =
    syntheticOnly ? "" : (process.env.IP_RASM_PHASE16_PHOTO ?? "");
  if (!input) {
    const jpeg = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 500;
      const x = canvas.getContext("2d")!;
      x.fillStyle = "white";
      x.fillRect(0, 0, 400, 500);
      x.fillStyle = "#c4a991";
      x.beginPath();
      x.ellipse(200, 235, 110, 165, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#252525";
      x.beginPath();
      x.ellipse(200, 115, 112, 70, 0, Math.PI, 2 * Math.PI);
      x.fill();
      x.fillRect(130, 190, 40, 12);
      x.fillRect(230, 190, 40, 12);
      x.strokeStyle = "#504035";
      x.lineWidth = 9;
      x.beginPath();
      x.moveTo(200, 225);
      x.lineTo(185, 280);
      x.lineTo(212, 280);
      x.stroke();
      x.beginPath();
      x.moveTo(160, 330);
      x.quadraticCurveTo(200, 350, 240, 330);
      x.stroke();
      return canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
    });
    input = {
      name: "original-synthetic-portrait.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpeg, "base64"),
    };
  }
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (await chooser).setFiles(input);
  await expect(page.getByTestId("customer-adjust")).toBeVisible();
  await expect(page.locator("button.customer-main-action")).toBeEnabled({
    timeout: 90000,
  });
  await expect(page.getByTestId("server-generation-consent")).toContainText(
    "server",
  );
}
export async function result(page: Page) {
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 90000,
  });
  await expect(page.getByTestId("customer-thread-result")).toHaveJSProperty(
    "naturalWidth",
    1000,
  );
  await expect(page.locator(".customer-progress")).toHaveCount(0);
}
