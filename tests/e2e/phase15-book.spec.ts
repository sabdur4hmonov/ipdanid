import { test, expect } from "./legacy-test";
import { openMore } from "./navigation";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import {
  bookCsv,
  bookLeafSvg,
  validateBookPlan,
} from "../../src/core/book-folding";
import { mockCraftVoices } from "./craft-voice";
import { unlockCraftGuide } from "./kit-access";
async function enter(page: any) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Book folding (experimental)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create folding plan", exact: true }),
  ).toBeEnabled();
}
async function exported(page: any, name: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return await download;
}
test("book measurements use only requested local language speech and stop on a different leaf", async ({
  page,
}) => {
  await mockCraftVoices(page);
  await enter(page);
  await page
    .getByRole("button", { name: "Create folding plan", exact: true })
    .click();
  await unlockCraftGuide(page);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"]) {
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    const speech = page.getByTestId("craft-step-voice");
    await speech.getByRole("button").first().click();
    const lang = locale.startsWith("uz")
      ? "uz-UZ"
      : locale === "ru"
        ? "ru-RU"
        : "en-US";
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__craftSpoken.at(-1)?.lang),
      )
      .toBe(lang);
  }
  expect(
    await page.evaluate(() => (window as any).__craftSpoken.at(-1).text),
  ).toContain("one hundred sixty one");
  const stopped = await page.evaluate(() => (window as any).__craftStops);
  await page.getByLabel("Folding step", { exact: true }).fill("5");
  await expect
    .poll(() => page.evaluate(() => (window as any).__craftStops))
    .toBeGreaterThan(stopped);
  await page
    .getByRole("button", { name: "Read this step", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__craftSpoken.at(-1)?.text))
    .toContain("Top mark");
  await page
    .getByRole("button", { name: "Stop step voice", exact: true })
    .click();
});
async function unlock(page: any) {
  const issued = await page.request.post(
    process.env.IP_RASM_TEST_API_URL + "/api/admin/kits/batch",
    {
      headers: { Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN}` },
      data: { profile: "book-e2e", count: 1, requestKey: crypto.randomUUID() },
    },
  );
  expect(issued.ok()).toBe(true);
  const batch = await issued.json(),
    gate = page.getByTestId("craft-build-gate");
  await gate
    .getByLabel("Kit code for sign-in", { exact: true })
    .fill(batch.codes[0].code);
  await gate
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("craft-credits")).toContainText(
    String(batch.codes[0].quota),
  );
  await gate
    .getByRole("button", { name: "Use 1 credit and unlock", exact: true })
    .click();
  await expect(gate).toHaveCount(0);
}
test("book marks require a signed build and the exact plan resumes and exports offline", async ({
  page,
  context,
}, info) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Create folding plan", exact: true })
    .click();
  await expect(page.getByTestId("craft-build-gate")).toBeVisible();
  await expect(page.getByTestId("book-current")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Folding marks CSV", exact: true }),
  ).toHaveCount(0);
  await unlock(page);
  await expect(page.getByTestId("book-current")).toContainText("Leaf 161");
  const raw = JSON.parse(
      readFileSync(
        (await (await exported(page, "Folding project JSON")).path())!,
        "utf8",
      ),
    ),
    g = await validateBookPlan(raw.project.guide);
  expect(
    readFileSync(
      (await (await exported(page, "Folding marks CSV")).path())!,
      "utf8",
    ),
  ).toBe(bookCsv(g));
  expect(
    readFileSync(
      (await (await exported(page, "Current leaf SVG")).path())!,
      "utf8",
    ),
  ).toBe(bookLeafSvg(g, 1));
  await page.getByLabel("Folding step", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Confirm through this leaf", exact: true })
    .click();
  await expect(page.getByTestId("book-progress")).toContainText("2/80");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await enter(page);
  await page
    .getByRole("button", { name: "Open folding project", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("book-progress")).toContainText("2/80");
  await expect(page.getByTestId("book-current")).toContainText("Leaf 163");
  const out = `output/current-book/${info.project.name}`;
  mkdirSync(out, { recursive: true });
  await (await exported(page, "Folding PDF")).saveAs(out + "/book.pdf");
  const pdf = await PDFDocument.load(readFileSync(out + "/book.pdf"));
  expect(pdf.getSubject()).toBe(g.sequenceHash);
  expect(pdf.getPages()).toHaveLength(7);
  writeFileSync(out + "/guide.json", JSON.stringify(raw));
  await page.screenshot({ path: out + "/screen.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(false);
  await page.getByLabel("Pattern type", { exact: true }).selectOption("text");
  await page.getByLabel("Name or date", { exact: true }).fill("2026");
  await page
    .getByRole("button", { name: "Create folding plan", exact: true })
    .click();
  await expect(page.getByTestId("craft-build-gate")).toBeVisible();
  await expect(page.getByTestId("book-current")).toHaveCount(0);
});
test("book infeasible plans, forged imports and stale updates cannot replace valid progress", async ({
  page,
  context,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Create folding plan", exact: true })
    .click();
  await unlock(page);
  const raw = JSON.parse(
      readFileSync(
        (await (await exported(page, "Folding project JSON")).path())!,
        "utf8",
      ),
    ),
    hash = raw.project.guide.sequenceHash;
  const other = await context.newPage();
  await enter(other);
  await other
    .getByRole("button", { name: "Open folding project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("book-current")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm through this leaf", exact: true })
    .click();
  await expect(page.getByTestId("book-progress")).toContainText("1/80");
  await other
    .getByRole("button", { name: "Confirm through this leaf", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("another window");
  await other.close();
  await page.getByTestId("book-studio").locator("summary").click();
  await page.getByLabel("Available leaves", { exact: true }).fill("40");
  await page
    .getByRole("button", { name: "Create folding plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Not enough leaves");
  await expect(page.locator("[data-book-hash]")).toHaveAttribute(
    "data-book-hash",
    hash,
  );
  await expect(page.getByTestId("book-progress")).toContainText("1/80");
  raw.project.guide.leaves.find((l: any) => l.top).top.reflected[0] = -5;
  await page
    .getByLabel("Import folding project", { exact: true })
    .setInputFiles({
      name: "tampered.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(raw)),
    });
  await expect(page.getByRole("alert")).toContainText("Check page size");
  await expect(page.getByTestId("book-progress")).toContainText("1/80");
});
