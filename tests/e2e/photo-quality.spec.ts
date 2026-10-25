import { unlockIfNeeded } from "./kit-access";
import { openMore } from "./navigation";
import { test, expect } from "./legacy-test";
import { mkdirSync, readFileSync } from "node:fs";
import { validateInstruction } from "../../src/core/validation";
async function reviewEveryPerson(page: import("@playwright/test").Page) {
  // Each person is confirmed separately (R2); one click no longer confirms a group.
  const people = page.getByTestId("people-region-editor");
  const count = await people.getByTestId("person-status").count();
  for (let k = 0; k < count; k++) {
    await people.getByTestId("person-status").nth(k).locator("button").click();
    await people.getByTestId("review-person").click();
    await expect(people.getByTestId("person-status").nth(k)).toHaveAttribute(
      "data-reviewed",
      "true",
    );
  }
}
test("two-person manual regions, photo advice and guarded worker stay consistent through touch, saving and export", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByTestId("mark-two-faces").click();
  const people = page.getByTestId("people-region-editor");
  await expect(people).toBeVisible();
  await people.getByLabel("Person", { exact: true }).selectOption("1");
  await expect(
    page.getByTestId("photo-quality-advice").locator("[data-person]"),
  ).toHaveCount(2);
  const mouth = people.locator('[data-region="mouth"]'),
    before = await mouth.getAttribute("data-box");
  await mouth.scrollIntoViewIfNeeded();
  const rect = await mouth.boundingBox();
  if (!rect) throw Error("Mouth box missing");
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 8, y: y + 6 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 8, y + 6, { steps: 3 });
    await page.mouse.up();
  }
  await expect(mouth).not.toHaveAttribute("data-box", before!);
  await expect(page.getByTestId("people-review-blocked")).toBeVisible();
  await page.getByRole("button", { name: "Turn right", exact: true }).click();
  await expect(page.getByTestId("shape-crop")).toHaveAttribute(
    "data-edits",
    /"rotation":90/,
  );
  await page.getByRole("button", { name: "Turn left", exact: true }).click();
  await expect(page.getByTestId("shape-crop")).toHaveAttribute(
    "data-edits",
    /"rotation":0/,
  );
  for (const [lang, title] of [
    ["uz", "Suratni tekshiring"],
    ["uz-Cyrl", "Суратни текширинг"],
    ["ru", "Проверьте фотографию"],
    ["en", "Check your photo"],
  ]) {
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(lang);
    await expect(page.getByTestId("photo-quality-advice")).toContainText(title);
  }
  // Rotation remaps every face, so each person is confirmed again afterwards.
  await reviewEveryPerson(page);
  await expect(page.getByTestId("people-review-blocked")).toHaveCount(0);
  await page
    .getByTestId("advanced-generation")
    .locator("summary")
    .first()
    .click();
  await page.getByLabel("Maximum lines", { exact: true }).focus();
  await page.keyboard.press("Home");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  const canvas = page.locator(".result-card canvas[data-sequence-hash]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const hash = await canvas.getAttribute("data-sequence-hash");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await expect(page.getByTestId("player-hash")).toHaveText(hash!);
  mkdirSync("output/takeover",{recursive:true});
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project JSON", exact: true })
    .first()
    .click();
  const downloaded=await download;
  await downloaded.saveAs(`output/takeover/group-${info.project.name}-${hash!.slice(0,12)}.json`);
  const file = JSON.parse(readFileSync((await downloaded.path())!,"utf-8"));
  const i = file.project.instruction;
  await validateInstruction(i);
  expect(i.algorithm).toBe("group-optical/15");
  expect(i.sequenceHash).toBe(hash);
  expect(i.params.portrait.people.faces).toHaveLength(2);
  expect(i.metrics.regions.final["person2.nose"].pixels).toBeGreaterThan(0);
  expect(file.project.progress.confirmed).toBe(0);
  mkdirSync("output/pdf",{recursive:true});
  const pdf=page.waitForEvent("download");await page.getByRole("button",{name:"PDF guide",exact:true}).first().click();await(await pdf).saveAs(`output/pdf/group-${info.project.name}-${hash!.slice(0,12)}.pdf`);
  mkdirSync("output/takeover", { recursive: true });
  await page.screenshot({
    path: `output/takeover/${info.project.name}-group-guide.png`,
    fullPage: true,
  });
});
