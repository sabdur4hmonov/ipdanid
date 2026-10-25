import { test, expect } from "./legacy-test";
import { openMore } from "./navigation";
import { unlockCraftGuide } from "./kit-access";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  validateSolidPlan,
  solidPartMesh,
  solidTemplateSvg,
  solidLayoutSvg,
} from "../../src/core/solid-plan";
import { solidStl, meshFacts } from "../../src/core/solid-geometry";
import { LETTERING_FONTS } from "../../src/core/lettering";
import { PDFDocument } from "pdf-lib";
import { mockCraftVoices } from "./craft-voice";
const fonts = Object.fromEntries(
  Object.entries(LETTERING_FONTS).map(([id, f]) => [
    id,
    new Uint8Array(readFileSync("public" + f.path)),
  ]),
);
async function enter(page: any) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", { name: "3D models (experimental)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create 3D plan", exact: true }),
  ).toBeEnabled();
}
async function exported(page: any, name: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return await event;
}
async function json(page: any) {
  return JSON.parse(
    readFileSync(
      (await (await exported(page, "3D project JSON")).path())!,
      "utf8",
    ),
  );
}
test("measured frame rotates actual geometry, unlocks exact STL and layouts and resumes offline with physical PDF", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await mockCraftVoices(page);
  await enter(page);
  await page
    .getByRole("button", { name: "Create 3D plan", exact: true })
    .click();
  const canvas = page.getByTestId("solid-view").locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("craft-build-gate")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Current part STL", exact: true }),
  ).toHaveCount(0);
  const original = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page),
      x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 40, y: y + 15 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 40,
      box.y + box.height / 2 + 15,
      { steps: 6 },
    );
    await page.mouse.up();
  }
  await expect(canvas).not.toHaveAttribute("data-yaw", "335");
  expect(
    await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(original);
  const out = `output/current-solid/${info.project.name}/frame`;
  mkdirSync(out, { recursive: true });
  await canvas.screenshot({ path: out + "/rotated.png" });
  await page
    .getByRole("button", { name: "Reset 3D view", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-yaw", "335");
  await unlockCraftGuide(page);
  await page
    .getByRole("button", { name: "Read this step", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__craftSpoken.at(-1)?.text))
    .toContain("Part one");
  await page
    .getByRole("button", { name: "Stop step voice", exact: true })
    .click();
  const raw = await json(page),
    g = await validateSolidPlan(raw.project.guide);
  expect(g.parts).toHaveLength(4);
  expect(await canvas.getAttribute("data-solid-hash")).toBe(g.sequenceHash);
  const stl = await exported(page, "Current part STL"),
    bytes = readFileSync((await stl.path())!);
  expect(
    bytes.equals(Buffer.from(solidStl(solidPartMesh(g, 1), g.sequenceHash))),
  ).toBe(true);
  await stl.saveAs(out + "/part.stl");
  const svg = await exported(page, "Current part SVG");
  expect(readFileSync((await svg.path())!, "utf8")).toBe(
    solidTemplateSvg(g, 1),
  );
  await svg.saveAs(out + "/part.svg");
  const layout = await exported(page, "Assembly layout SVG");
  expect(readFileSync((await layout.path())!, "utf8")).toBe(solidLayoutSvg(g));
  await layout.saveAs(out + "/assembly.svg");
  await page.getByLabel("Assembly step", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Confirm through this part", exact: true })
    .click();
  await expect(page.getByTestId("solid-progress")).toContainText("2/4");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await enter(page);
  await page
    .getByRole("button", { name: "Open 3D project", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("solid-progress")).toContainText("2/4");
  await expect(page.getByTestId("solid-current")).toContainText("rail-3");
  const pdf = await exported(page, "All parts PDF");
  await pdf.saveAs(out + "/parts.pdf");
  const doc = await PDFDocument.load(readFileSync(out + "/parts.pdf"));
  expect(doc.getSubject()).toBe(g.sequenceHash);
  expect(doc.getPages()).toHaveLength(28);
  writeFileSync(out + "/guide.json", JSON.stringify(raw));
  await page.screenshot({ path: out + "/screen.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(false);
});
test("layered sculpture and mixed lettering use ordered physical parts and a second exact-hash credit", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await enter(page);
  await page
    .getByLabel("What to make?", { exact: true })
    .selectOption("spindle");
  await page
    .getByRole("button", { name: "Create 3D plan", exact: true })
    .click();
  const quota = await unlockCraftGuide(page),
    raw = await json(page),
    g = await validateSolidPlan(raw.project.guide);
  expect(g.parts).toHaveLength(20);
  const modelCanvas = page.getByTestId("solid-view").locator("canvas"),
    assembled = await modelCanvas.evaluate((c: HTMLCanvasElement) =>
      c.toDataURL(),
    );
  await page
    .getByRole("checkbox", { name: "Show current part only", exact: true })
    .check();
  await expect
    .poll(() => modelCanvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .not.toBe(assembled);
  await page
    .getByRole("checkbox", { name: "Show current part only", exact: true })
    .uncheck();
  await page.getByLabel("Assembly step", { exact: true }).fill("10");
  await expect(page.getByTestId("solid-current")).toContainText("layer-10");
  const out = `output/current-solid/${info.project.name}/spindle`;
  mkdirSync(out, { recursive: true });
  const stl = await exported(page, "Current part STL");
  expect(
    readFileSync((await stl.path())!).equals(
      Buffer.from(solidStl(solidPartMesh(g, 10), g.sequenceHash)),
    ),
  ).toBe(true);
  expect(meshFacts(solidPartMesh(g, 10)).min[2]).toBe(0);
  await stl.saveAs(out + "/part.stl");
  await (await exported(page, "Current part SVG")).saveAs(out + "/part.svg");
  await (await exported(page, "All parts PDF")).saveAs(out + "/parts.pdf");
  expect(
    (await PDFDocument.load(readFileSync(out + "/parts.pdf"))).getPages(),
  ).toHaveLength(42);
  writeFileSync(out + "/guide.json", JSON.stringify(raw));
  await page
    .getByTestId("solid-view")
    .locator("canvas")
    .screenshot({ path: out + "/model.png" });
  await page
    .getByRole("button", { name: "Confirm through this part", exact: true })
    .click();
  await expect(page.getByTestId("solid-progress")).toContainText("10/20");
  await page
    .getByLabel("What to make?", { exact: true })
    .selectOption("letters");
  await page.getByLabel("Text", { exact: true }).fill("Ali علي");
  await page
    .getByRole("button", { name: "Create 3D plan", exact: true })
    .click();
  const gate = page.getByTestId("craft-build-gate");
  await expect(gate).toBeVisible();
  await expect(page.getByTestId("craft-credits")).toContainText(
    String(quota - 1),
  );
  await expect(
    page.getByRole("button", { name: "Current part STL", exact: true }),
  ).toHaveCount(0);
  await gate
    .getByRole("button", { name: "Use 1 credit and unlock", exact: true })
    .click();
  await expect(gate).toHaveCount(0);
  const mixed = await json(page),
    letters = await validateSolidPlan(mixed.project.guide, fonts),
    folder = `output/current-solid/${info.project.name}/letters`;
  mkdirSync(folder, { recursive: true });
  for (let step = 1; step <= letters.parts.length; step++) {
    await page.getByLabel("Assembly step", { exact: true }).fill(String(step));
    const file = await exported(page, "Current part STL");
    expect(
      readFileSync((await file.path())!).equals(
        Buffer.from(
          solidStl(solidPartMesh(letters, step), letters.sequenceHash),
        ),
      ),
    ).toBe(true);
    await file.saveAs(folder + "/" + letters.parts[step - 1].id + ".stl");
  }
  const layout = await exported(page, "Assembly layout SVG");
  expect(readFileSync((await layout.path())!, "utf8")).toBe(
    solidLayoutSvg(letters),
  );
  await layout.saveAs(folder + "/assembly.svg");
  await (await exported(page, "All parts PDF")).saveAs(folder + "/parts.pdf");
  writeFileSync(folder + "/guide.json", JSON.stringify(mixed));
  await page.getByLabel("Rotate model", { exact: true }).press("Home");
  await page.getByLabel("View tilt", { exact: true }).press("Home");
  await page
    .getByTestId("solid-view")
    .locator("canvas")
    .screenshot({ path: folder + "/model.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("invalid dimensions, forged models and stale-window writes cannot overwrite a valid paid plan", async ({
  page,
  context,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Create 3D plan", exact: true })
    .click();
  await unlockCraftGuide(page);
  const raw = await json(page),
    hash = raw.project.guide.sequenceHash;
  const other = await context.newPage();
  await enter(other);
  await other
    .getByRole("button", { name: "Open 3D project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("solid-current")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm through this part", exact: true })
    .click();
  await expect(page.getByTestId("solid-progress")).toContainText("1/4");
  await other
    .getByRole("button", { name: "Confirm through this part", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("another window");
  await other
    .getByRole("button", { name: "Delete 3D project", exact: true })
    .first()
    .click();
  await expect(other.getByRole("alert")).toContainText("another window");
  await other
    .getByRole("button", { name: "Open 3D project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("solid-progress")).toContainText("1/4");
  await other
    .getByRole("button", { name: "Confirm through this part", exact: true })
    .click();
  await expect(other.getByTestId("solid-progress")).toContainText("2/4");
  await page
    .getByRole("button", { name: "Open 3D project", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("solid-progress")).toContainText("2/4");
  await other.close();
  await page.getByLabel("Frame rail width (mm)", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Create 3D plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Check dimensions");
  await expect(page.locator("[data-solid-plan]")).toHaveAttribute(
    "data-solid-plan",
    hash,
  );
  raw.project.guide.parts[0].heightMm = 99;
  await page.getByLabel("Import 3D project", { exact: true }).setInputFiles({
    name: "forged.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(raw)),
  });
  await expect(page.getByRole("alert")).toContainText("Check dimensions");
  await expect(page.getByTestId("solid-progress")).toContainText("2/4");
});
