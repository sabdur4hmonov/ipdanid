import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
test("shape framing uses mouse/touch, reversible fit and immutable saved crop", async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByRole("button", { name: "Heart", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Heart", exact: true }).click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await revealControl(page.getByLabel("Eyes Left", { exact: true }));
  await page.getByLabel("Eyes Left", { exact: true }).fill("0.3");
  const frame = page.getByTestId("shape-crop");
  await expect(frame.locator("svg[data-shape]")).toHaveAttribute(
    "data-shape",
    "heart",
  );
  await frame.scrollIntoViewIfNeeded();
  const initial = JSON.parse((await frame.getAttribute("data-edits"))!),
    r = (await frame.boundingBox())!;
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width * 0.3, y: r.y + r.height * 0.4 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: r.x + r.width * 0.35, y: r.y + r.height * 0.42 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: r.x + r.width * 0.3, y: r.y + r.height * 0.5 },
        { x: r.x + r.width * 0.7, y: r.y + r.height * 0.5 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: r.x + r.width * 0.25, y: r.y + r.height * 0.5 },
        { x: r.x + r.width * 0.75, y: r.y + r.height * 0.5 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(r.x + r.width * 0.3, r.y + r.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width * 0.35, r.y + r.height * 0.42, {
      steps: 4,
    });
    await page.mouse.up();
    await page.mouse.wheel(0, -100);
  }
  await expect
    .poll(
      async () => JSON.parse((await frame.getAttribute("data-edits"))!).zoom,
    )
    .toBeGreaterThan(initial.zoom);
  const gestured = JSON.parse((await frame.getAttribute("data-edits"))!);
  expect(gestured.panX).not.toBe(initial.panX);
  const beforeSlider = JSON.parse((await frame.getAttribute("data-portrait"))!);
  expect(beforeSlider.regions.placement).toBe("manual");
  await revealControl(page.getByLabel("Zoom", { exact: true }));
  await page.getByLabel("Zoom", { exact: true }).fill("1.5");
  const afterSlider = JSON.parse((await frame.getAttribute("data-portrait"))!);
  expect(afterSlider.regions).not.toEqual(beforeSlider.regions);
  expect(afterSlider.regions.placement).toBe("manual");
  await frame.scrollIntoViewIfNeeded();
  const moved = JSON.parse((await frame.getAttribute("data-edits"))!);
  await revealControl(page.getByRole("button", { name: "Mark face bounds", exact: true, includeHidden: true }));
  await page
    .getByRole("button", { name: "Mark face bounds", exact: true })
    .click();
  await expect(page.getByTestId("crop-face-box")).toBeVisible();
  const originalPortrait = JSON.parse(
    (await frame.getAttribute("data-portrait"))!,
  );
  const faceBox = (await page.getByTestId("crop-face-box").boundingBox())!;
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        {
          x: faceBox.x + faceBox.width * 0.4,
          y: faceBox.y + faceBox.height * 0.4,
        },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: faceBox.x + faceBox.width * 0.4 + 5,
          y: faceBox.y + faceBox.height * 0.4 + 3,
        },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(
      faceBox.x + faceBox.width * 0.4,
      faceBox.y + faceBox.height * 0.4,
    );
    await page.mouse.down();
    await page.mouse.move(
      faceBox.x + faceBox.width * 0.4 + 5,
      faceBox.y + faceBox.height * 0.4 + 3,
    );
    await page.mouse.up();
  }
  const marked = JSON.parse((await frame.getAttribute("data-portrait"))!);
  expect(marked.face).not.toEqual(originalPortrait.face);
  expect(marked.regions).toEqual(originalPortrait.regions);
  await revealControl(page.getByRole("button", { name: "Fit marked face to shape", exact: true, includeHidden: true }));
  await page
    .getByRole("button", { name: "Fit marked face to shape", exact: true })
    .click();
  const fit = JSON.parse((await frame.getAttribute("data-edits"))!);
  expect(fit).not.toEqual(moved);
  await page
    .getByRole("button", { name: "Undo shape fit", exact: true })
    .click();
  expect(JSON.parse((await frame.getAttribute("data-edits"))!)).toEqual(moved);
  for (const [locale, text] of [
    ["uz", "avtomatik aniqlash emas"],
    ["ru", "не автоматическое распознавание"],
    ["en", "not automatic detection"],
  ]) {
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(page.locator("body")).toContainText(text);
  }
  await revealControl(page.getByRole("button", { name: "Fit marked face to shape", exact: true, includeHidden: true }));
  await page
    .getByRole("button", { name: "Fit marked face to shape", exact: true })
    .click();
  const expected = JSON.parse((await frame.getAttribute("data-edits"))!);
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("48");
  await revealControl(page.getByLabel("Maximum lines", { exact: true }));
  await page.getByLabel("Maximum lines", { exact: true }).fill("200");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const p = JSON.parse(
    readFileSync((await (await download).path())!, "utf8"),
  ).project;
  expect(p.edits).toEqual(expected);
  expect(p.instruction.profile.shape).toBe("heart");
  expect(p.progress.confirmed).toBe(0);
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    p.instruction.sequenceHash,
  );
});
