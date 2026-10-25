import { test, expect } from "./legacy-test";
import type { Page } from "@playwright/test";
import { openMore } from "./navigation";
import { mockCraftVoices } from "./craft-voice";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  tutorialIds,
  TUTORIALS,
  validateTutorial,
  tutorialSvg,
} from "../../src/core/tutorials";
import { tutorialPhrase } from "../../src/tutorial-i18n";
async function enter(page: Page) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Free workshop", exact: true })
    .click();
  await expect(page.getByTestId("tutorial-studio")).toBeVisible();
}
async function start(page: Page, id: string) {
  await page
    .getByTestId("tutorial-card-" + id)
    .getByRole("button", { name: "Start or resume", exact: true })
    .click();
  await expect(page.getByTestId("tutorial-player")).toBeVisible();
}
async function exported(page: Page, name: string) {
  const done = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return await done;
}
async function project(page: Page) {
  return JSON.parse(
    readFileSync(
      (await (await exported(page, "Workshop JSON")).path())!,
      "utf8",
    ),
  );
}
test("three original free workshops have actual actions and exact exported templates and resume offline", async ({
  page,
  context,
}, info) => {
  test.setTimeout(150000);
  await enter(page);
  const out = `output/current-tutorial/${info.project.name}`;
  mkdirSync(out, { recursive: true });
  for (const id of tutorialIds) {
    await start(page, id);
    await expect(page.getByTestId("craft-build-gate")).toHaveCount(0);
    const raw = await project(page),
      g = await validateTutorial(raw.project.guide);
    expect(g.id).toBe(id);
    expect(raw.project.confirmed).toBe(0);
    await expect(page.getByTestId("tutorial-step-text")).toHaveText(
      tutorialPhrase(TUTORIALS[id].steps[0], "en"),
    );
    await (
      await exported(page, "Workshop template SVG")
    ).saveAs(out + `/${id}.svg`);
    expect(readFileSync(out + `/${id}.svg`, "utf8")).toBe(tutorialSvg(id, 1));
    await page.getByRole("button", { name: "Mark done", exact: true }).click();
    await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
      "data-confirmed",
      "1",
    );
    await (await exported(page, "Workshop PDF")).saveAs(out + `/${id}.pdf`);
    const doc = await PDFDocument.load(readFileSync(out + `/${id}.pdf`));
    expect(doc.getSubject()).toBe(g.sequenceHash);
    expect(doc.getPageCount()).toBe(8);
    writeFileSync(
      out + `/${id}.json`,
      JSON.stringify(await project(page), null, 2),
    );
    await page
      .getByTestId("tutorial-player")
      .screenshot({ path: out + `/${id}.png` });
  }
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await enter(page);
  for (const id of tutorialIds) {
    await start(page, id);
    await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
      "data-confirmed",
      "1",
    );
    await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
      "data-step",
      "2",
    );
  }
  await (
    await exported(page, "Workshop PDF")
  ).saveAs(out + "/ebru-offline.pdf");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("workshop stale confirmations and deletion are refused and fresh reopen restores exact progress", async ({
  page,
  context,
}) => {
  await enter(page);
  await start(page, "cardboard");
  const original = await project(page);
  const other = await context.newPage();
  await enter(other);
  await start(other, "cardboard");
  await page.getByRole("button", { name: "Mark done", exact: true }).click();
  await other.getByRole("button", { name: "Mark done", exact: true }).click();
  await expect(other.getByRole("alert")).toContainText("another window");
  await start(other, "cardboard");
  await expect(other.getByTestId("tutorial-player")).toHaveAttribute(
    "data-step",
    "2",
  );
  await other.getByRole("button", { name: "Mark done", exact: true }).click();
  await expect(other.getByTestId("tutorial-player")).toHaveAttribute(
    "data-confirmed",
    "2",
  );
  await page.getByText("Saved workshops", { exact: true }).click();
  await page
    .getByRole("button", { name: "Delete workshop", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("another window");
  original.project.guide.sequenceHash = "0".repeat(64);
  await other
    .getByLabel("Import workshop", { exact: true })
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(original)),
    });
  await expect(other.getByRole("alert")).toContainText("Check the file");
  await expect(other.getByTestId("tutorial-player")).toHaveAttribute(
    "data-confirmed",
    "2",
  );
  const restored = await project(other);
  await page
    .getByLabel("Import workshop", { exact: true })
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(restored)),
    });
  await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
    "data-confirmed",
    "2",
  );
  expect((await project(page)).project.id).not.toBe(restored.project.id);
  await other.close();
});
test("original panel model rotates by touch or pointer and timed playback never marks work done", async ({
  page,
  context,
}, info) => {
  await mockCraftVoices(page);
  await enter(page);
  await start(page, "paper");
  const canvas = page.getByTestId("tutorial-rotation").locator("canvas"),
    before = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await canvas.scrollIntoViewIfNeeded();
  const b = (await canvas.boundingBox())!,
    x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 35, y: y + 12 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 35, y + 12, { steps: 4 });
    await page.mouse.up();
  }
  await expect(canvas).not.toHaveAttribute("data-yaw", "335");
  expect(
    await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(before);
  await page
    .getByTestId("tutorial-rotation")
      .getByRole("button", { name: "Reset 3D view", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-yaw", "335");
  await page
    .getByRole("button", { name: "Read this step", exact: true })
    .click();
  expect(
    await page.evaluate(() => (window as any).__craftSpoken.at(-1).text),
  ).toContain("13 creases");
  await page.clock.install();
  await page.getByRole("button", { name: "Play steps", exact: true }).click();
  await page.clock.runFor(8100);
  await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
    "data-step",
    "2",
  );
  await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
    "data-confirmed",
    "0",
  );
  await page.getByRole("button", { name: "Pause steps", exact: true }).click();
  await page.clock.runFor(16000);
  await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
    "data-step",
    "2",
  );
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "Mark done", exact: true }).click();
  await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
    "data-confirmed",
    "6",
  );
  await expect(
    page.getByText("All steps completed", { exact: true }),
  ).toBeVisible();
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    await expect(page.getByTestId("tutorial-step-text")).toHaveText(
      tutorialPhrase(TUTORIALS.paper.steps[5], locale),
    );
  }
});
test("optional owner media verifies its content and a bad digest keeps the free instructions usable", async ({
  page,
}) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA2UAAAAASUVORK5CYII=",
    "base64",
  );
  const asset = {
    tutorial: "paper",
    step: 1,
    path: "/tutorials/owned/original-sample.png",
    bytes: png.length,
    sha256: createHash("sha256").update(png).digest("hex"),
    type: "image/png",
    credit: "Original test fixture",
    license: "Owned test",
  };
  await page.route("**/tutorials/manifest.json", (route) =>
    route.fulfill({
      json: {
        schema: "iprasm.tutorial-media/1",
        assets: [
          asset,
          {
            ...asset,
            step: 2,
            path: "/tutorials/owned/bad-sample.png",
            sha256: "0".repeat(64),
          },
        ],
      },
    }),
  );
  await page.route("**/tutorials/owned/*.png", (route) =>
    route.fulfill({ body: png, contentType: "image/png" }),
  );
  await enter(page);
  await start(page, "paper");
  await expect(
    page.getByTestId("tutorial-owned-media").locator("img"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId("tutorial-owned-media")
        .locator("img")
        .evaluate((i: HTMLImageElement) => i.naturalWidth),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByTestId("tutorial-owned-media").getByRole("status"),
  ).toContainText("Continue with the diagrams");
  await expect(
    page.getByRole("button", { name: "Mark done", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.getByRole("button", { name: "Mark done", exact: true }).click();
  await expect(page.getByTestId("tutorial-player")).toHaveAttribute(
    "data-confirmed",
    "1",
  );
});
