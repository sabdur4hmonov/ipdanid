import { newEvidenceRoot } from "../helpers/evidence-paths";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { english, png } from "./phase12-cases";
// These cases inject network responses; dedicated offline suites retain service workers.
test.use({ serviceWorkers: "block" });

test.use({ trace: "off" });
test("automatic cat cutout keeps the head and body; changing type retains placement", async ({
  page,
}, info) => {
  test.skip(
    !process.env.IP_RASM_LOCAL_CAT,
    "Optional owner-supplied local photo; never committed",
  );
  test.setTimeout(180000);
  await page.goto("/");
  await english(page);
  await expect(page.getByTestId("product-kind")).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (await chooser).setFiles(process.env.IP_RASM_LOCAL_CAT!);
  const create = page.getByRole("button", { name: "Create", exact: true });
  await expect(create).toBeEnabled({ timeout: 90000 });
  await expect(page.getByTestId("customer-flow")).toHaveAttribute(
    "data-kind",
    "animal",
  );
  await page.getByRole("button", { name: "Square", exact: true }).click();
  const photo = page.getByTestId("customer-photo");
  const samples = await photo.evaluate((c: HTMLCanvasElement) => {
    const f = JSON.parse(c.dataset.framing!).targetBounds;
    const value = (x: number, y: number) => {
      const d = c
        .getContext("2d")!
        .getImageData(
          Math.round((f.left + x * f.width) * 500),
          Math.round((f.top + y * f.height) * 500),
          1,
          1,
        ).data;
      return (d[0] + d[1] + d[2]) / 3;
    };
    return {
      head: value(0.4, 0.27),
      body: value(0.4, 0.6),
      background: value(0.92, 0.12),
    };
  });
  expect(samples.head).toBeLessThan(200);
  expect(samples.body).toBeLessThan(220);
  expect(samples.background).toBeGreaterThan(240);
  await page.getByRole("slider", { name: "Zoom", exact: true }).fill("1.4");
  const before = await photo.getAttribute("data-framing");
  await page.getByTestId("product-kind").selectOption("animal");
  await expect(create).toBeEnabled({ timeout: 90000 });
  expect(await photo.getAttribute("data-framing")).toBe(before);
  const out = newEvidenceRoot(`output/subject-repair/${info.project.name}/cat`);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    out + "/cutout.png",
    Buffer.from(await png(page, "customer-photo"), "base64"),
  );
  await page.screenshot({ path: out + "/adjust.png", fullPage: true });
  const start = Date.now();
  await create.click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  const elapsedMs = Date.now() - start;
  expect(elapsedMs).toBeLessThan(15000);
  writeFileSync(
    out + "/result.png",
    Buffer.from(await png(page, "customer-thread-result"), "base64"),
  );
  writeFileSync(
    out + "/checks.json",
    JSON.stringify({ samples, elapsedMs }, null, 2),
  );
});

test("unsupported cutout keeps the complete photo; Arabic and Latin lettering is reachable", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await english(page);
  await page.route("**/assets/photo-prepare.worker-*.js", (r) => r.abort());
  await page.getByTestId("product-kind").selectOption("object");
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 80;
    const x = c.getContext("2d")!;
    x.fillStyle = "#258ead";
    x.fillRect(0, 0, 80, 80);
    return c.toDataURL("image/png").split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "unknown.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(
    page.getByRole("button", { name: "Create", exact: true }),
  ).toBeEnabled({ timeout: 90000 });
  const after = await png(page, "customer-photo");
  await page.getByRole("button", { name: "Before", exact: true }).click();
  expect(await png(page, "customer-photo")).toBe(after);
  await page.getByTestId("product-kind").selectOption("lettering");
  await page.getByTestId("lettering-input").fill("سَلام Ali");
  await page.getByTestId("prepare-lettering").click();
  await expect(
    page.getByRole("button", { name: "Create", exact: true }),
  ).toBeEnabled({ timeout: 90000 });
  // The person model is unavailable: lettering must still be intact and usable.
  const inkWidth = await page
    .getByTestId("customer-photo")
    .evaluate((c: HTMLCanvasElement) => {
      const p = c.getContext("2d")!.getImageData(0, 0, 500, 500).data;
      let min = 500,
        max = 0;
      for (let k = 0; k < 250000; k++)
        if (p[k * 4] < 100) {
          min = Math.min(min, k % 500);
          max = Math.max(max, k % 500);
        }
      return max - min;
    });
  expect(inkWidth).toBeGreaterThan(380);
  const out = newEvidenceRoot(`output/subject-repair/${info.project.name}/lettering`);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    out + "/target.png",
    Buffer.from(await png(page, "customer-photo"), "base64"),
  );
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  writeFileSync(
    out + "/result.png",
    Buffer.from(await png(page, "customer-thread-result"), "base64"),
  );
});
