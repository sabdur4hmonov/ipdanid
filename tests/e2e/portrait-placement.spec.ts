import { test, expect } from "@playwright/test";
import { english } from "./phase12-cases";

test.use({ serviceWorkers: "block", trace: "off" });

test("portrait zoom is opt-in, translated, reversible and retained through a real generation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    (window as any).__portraitHashes = [];
    window.Worker = class extends Native {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        this.addEventListener("message", ({ data }) => {
          if (
            data.type === "done" &&
            data.instruction?.algorithm === "classic-greedy/3"
          )
            (window as any).__portraitHashes.push(
              data.instruction.sequenceHash,
            );
        });
      }
    };
  });
  // Deterministic detector fixture for interaction coverage. The owner-original
  // checks separately use the real local model and stay outside public CI.
  let intercepted = 0;
  await page.route("**/assets/photo-prepare.worker-*.js", (route) => {
    intercepted++;
    return route.fulfill({
      contentType: "text/javascript",
      body: `self.onmessage=({data})=>{
      if(!data.image)return;data.image.close();const values=new Float32Array(64).fill(1);
      const face={left:.28,top:.27,width:.5,height:.45};
      self.postMessage({id:data.id,mask:{width:8,height:8,values},subjectKind:'people',
      faces:[{face,eyes:{left:.36,top:.4,width:.3,height:.06},nose:{left:.46,top:.49,width:.12,height:.12},mouth:{left:.4,top:.62,width:.2,height:.06}}],
      faceUnavailable:false,cleanupUnavailable:false,analysisTurn:0},[values.buffer]);};`,
    });
  });
  await page.goto("/");
  await english(page);
  const jpeg = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 400;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, 300, 400);
    x.fillStyle = "#b59a86";
    x.beginPath();
    x.ellipse(155, 190, 74, 114, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#282828";
    x.fillRect(95, 70, 122, 70);
    x.fillRect(105, 166, 28, 10);
    x.fillRect(177, 166, 28, 10);
    x.strokeStyle = "#564136";
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(155, 185);
    x.lineTo(145, 225);
    x.lineTo(165, 225);
    x.moveTo(125, 263);
    x.lineTo(185, 263);
    x.stroke();
    return c.toDataURL("image/jpeg", 0.95).split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "original-drawn-portrait.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(jpeg, "base64"),
  });
  const photo = page.getByTestId("customer-photo"),
    read = async () => JSON.parse((await photo.getAttribute("data-framing"))!);
  await expect(page.locator("button.customer-main-action")).toBeEnabled();
  expect(intercepted).toBe(1);
  const initial = await read();
  expect(initial.framing.adjustments[0].zoom).toBe(1);
  const labels = {
    uz: "Yuzga yaqinlashtirish",
    "uz-Cyrl": "Юзга яқинлаштириш",
    ru: "Приблизить лица",
    en: "Zoom to faces",
  };
  for (const [locale, label] of Object.entries(labels)) {
    const menu = page.getByTestId("customer-menu");
    await menu.locator("summary").click();
    await page
      .locator('[data-testid="locale-picker"]:visible')
      .selectOption(locale);
    await menu.locator("summary").click();
    await expect(page.getByTestId("portrait-placement")).toHaveText(label);
  }
  for (const shape of ["Heart", "Square", "Circle"]) {
    await page.getByRole("button", { name: shape, exact: true }).click();
    const before = await read();
    await page.getByTestId("portrait-placement").click();
    const fit = await read();
    expect(fit.framing.adjustments[0].zoom).toBeGreaterThan(
      before.framing.adjustments[0].zoom,
    );
    expect(fit.framing.keepShoulders).toBe(true);
    expect(fit.framing.fadePx).toBe(0);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    expect(await read()).toEqual(before);
  }
  expect(await read()).toEqual(initial);
  await page.getByTestId("portrait-placement").click();
  const fitted = await read();
  await page.getByRole("button", { name: /^Rotate/ }).click();
  await page.getByTestId("portrait-placement").click();
  expect((await read()).framing.rotation).toBe(1);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByTestId("portrait-placement").click();
  expect(await read()).toEqual(fitted);
  await page.locator("button.customer-main-action").click();
  const preview = page.getByTestId("customer-thread-result");
  await expect(preview).toBeVisible({ timeout: 60000 });
  const hash = await page.evaluate(() =>
    (window as any).__portraitHashes.at(-1),
  );
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Adjust again", exact: true }).click();
  expect(await read()).toEqual(fitted);
  await page.locator("button.customer-main-action").click();
  await expect(preview).toBeVisible({ timeout: 60000 });
  expect(await page.evaluate(() => (window as any).__portraitHashes)).toEqual([
    hash,
    hash,
  ]);
});
