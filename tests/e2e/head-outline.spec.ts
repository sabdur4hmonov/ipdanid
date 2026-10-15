import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { targetToSource } from "../../src/core/coordinates";

test("manual outline keeps source coordinates, independent anatomy and per-photo ownership", async ({
  page,
  context,
}, info) => {
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
  const state = async () => ({
    edits: JSON.parse((await frame.getAttribute("data-edits"))!),
    portrait: JSON.parse((await frame.getAttribute("data-portrait"))!),
    outline: JSON.parse((await frame.getAttribute("data-outline"))!),
  });
  await revealControl(page.getByText("Whole-head outline · experimental", { exact: true }));
  await page
    .getByText("Whole-head outline · experimental", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Fit marked outline", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Mark outline points", exact: true })
    .click();
  await frame.scrollIntoViewIfNeeded();
  const box = (await frame.boundingBox())!;
  const cdp =
    info.project.name === "mobile-browser"
      ? await context.newCDPSession(page)
      : null;
  for (let j = 0; j < 8; j++) {
    const angle = (j * Math.PI) / 4,
      x = box.x + box.width * (0.5 + 0.22 * Math.cos(angle)),
      y = box.y + box.height * (0.47 + 0.32 * Math.sin(angle));
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else await page.mouse.click(x, y);
  }
  const tapped = await state();
  const handle = (await frame
    .locator('[data-outline-index="0"]')
    .boundingBox())!;
  const hx = handle.x + handle.width / 2,
    hy = handle.y + handle.height / 2;
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: hx, y: hy }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: hx - 4, y: hy + 2 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    await page.mouse.move(hx - 4, hy + 2);
    await page.mouse.up();
  }
  let before = await state();
  expect(before.outline[0]).not.toEqual(tapped.outline[0]);
  expect(before.outline.slice(1)).toEqual(tapped.outline.slice(1));
  expect(before.outline).toHaveLength(8);
  await page
    .getByRole("button", { name: "Fit marked outline", exact: true })
    .click();
  const fitted = await state();
  expect(fitted.edits).not.toEqual(before.edits);
  expect(fitted.outline).toEqual(before.outline);
  for (const key of ["eyes", "nose", "mouth"]) {
    const a = before.portrait.regions[key],
      b = fitted.portrait.regions[key];
    for (const corner of [0, 1]) {
      const old = targetToSource(
        a.left + corner * a.width,
        a.top + corner * a.height,
        512,
        512,
        before.edits,
        1,
        160,
      );
      const next = targetToSource(
        b.left + corner * b.width,
        b.top + corner * b.height,
        512,
        512,
        fitted.edits,
        1,
        160,
      );
      expect(next.x).toBeCloseTo(old.x, 7);
      expect(next.y).toBeCloseTo(old.y, 7);
    }
  }
  await page
    .getByRole("button", { name: "Undo shape fit", exact: true })
    .click();
  expect(await state()).toEqual(before);
  await revealControl(page.getByLabel("Computation resolution", { exact: true }));
  await page.getByLabel("Computation resolution", { exact: true }).selectOption("192");
  const highResolution = await state();
  for (const key of ["eyes", "nose", "mouth"]) {
    const a = before.portrait.regions[key],
      b = highResolution.portrait.regions[key];
    for (const corner of [0, 1]) {
      const old = targetToSource(
        a.left + corner * a.width,
        a.top + corner * a.height,
        512,
        512,
        before.edits,
        1,
        160,
      );
      const next = targetToSource(
        b.left + corner * b.width,
        b.top + corner * b.height,
        512,
        512,
        highResolution.edits,
        1,
        192,
      );
      expect(next.x).toBeCloseTo(old.x, 7);
      expect(next.y).toBeCloseTo(old.y, 7);
    }
  }
  await revealControl(page.getByLabel("Computation resolution", { exact: true }));
  await page.getByLabel("Computation resolution", { exact: true }).selectOption("160");
  const restoredResolution = await state();
  expect(restoredResolution.edits).toEqual(before.edits);
  for (const key of ["eyes", "nose", "mouth"])
    for (const field of ["left", "top", "width", "height"])
      expect(restoredResolution.portrait.regions[key][field]).toBeCloseTo(
        before.portrait.regions[key][field],
        12,
      );
  before = restoredResolution;
  const lighten = page.getByRole("button", {
    name: "Lighten background outside outline",
    exact: true,
  });
  await lighten.click();
  const lightened = await state();
  expect(lightened.edits).toEqual(before.edits);
  expect(lightened.outline).toEqual(before.outline);
  expect(lightened.portrait.regions).toEqual(before.portrait.regions);
  expect(lightened.portrait.backgroundMode).toBe("manual-light");
  expect(lightened.portrait.backgroundMask).toMatch(/^[0-9a-f]{1024}$/);
  expect(lightened.portrait.backgroundMask).not.toBe("0".repeat(1024));
  await page
    .getByRole("button", { name: "Undo shape fit", exact: true })
    .click();
  expect(await state()).toEqual(before);
  await lighten.click();
  await revealControl(page.getByLabel("Zoom", { exact: true }));
  await page.getByLabel("Zoom", { exact: true }).fill("0.8");
  await expect
    .poll(async () => (await state()).portrait.backgroundMask)
    .toBeUndefined();
  expect((await state()).outline).toEqual(before.outline);
  await page.getByText("Point coordinates", { exact: true }).click();
  await revealControl(page.getByLabel("Outline point 1 X", { exact: true }));
  await page.getByLabel("Outline point 1 X", { exact: true }).fill("65");
  expect((await state()).outline[0].x).toBe(0.65);
  const saved = await state();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "outline-second.png",
      mimeType: "image/png",
      buffer: await page
        .getByLabel("Edited photo", { exact: true })
        .screenshot(),
    });
  expect((await state()).outline).toEqual([]);
  await revealControl(page.getByTestId("advanced-photo").getByRole("button", { name: "Try an original sample", exact: true, includeHidden: true }));
  await page.getByTestId("advanced-photo")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  expect(await state()).toEqual(saved);
  await revealControl(page.getByText("Whole-head outline · experimental", { exact: true }));
  await page
    .getByText("Whole-head outline · experimental", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear outline", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mark outline points", exact: true })
    .click();
  // Rapid events in one browser task: React cannot render between added points.
  await frame.evaluate((el) => {
    const r = el.getBoundingClientRect();
    el.setPointerCapture = () => {};
    for (let j = 0; j < 8; j++) {
      const angle = (j * Math.PI) / 4;
      for (const type of ["pointerdown", "pointerup"])
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 91,
            clientX: r.left + r.width * (0.5 + 0.22 * Math.cos(angle)),
            clientY: r.top + r.height * (0.5 + 0.22 * Math.sin(angle)),
          }),
        );
    }
  });
  expect((await state()).outline).toHaveLength(8);
  await page.getByText("Point coordinates", { exact: true }).click();
  // A nonadjacent point touches the first: fitting must reject, never mutate the crop.
  const crossed = await state();
  await revealControl(page.getByLabel("Outline point 5 X", { exact: true }));
  await page.getByLabel("Outline point 5 X", { exact: true }).fill(String(crossed.outline[0].x * 100));
  await revealControl(page.getByLabel("Outline point 5 Y", { exact: true }));
  await page.getByLabel("Outline point 5 Y", { exact: true }).fill(String(crossed.outline[0].y * 100));
  const invalid = await state();
  await page
    .getByRole("button", { name: "Fit marked outline", exact: true })
    .click();
  expect((await state()).edits).toEqual(invalid.edits);
  await expect(
    page.getByRole("status").filter({ hasText: "Outline is incomplete" }),
  ).toBeVisible();
});
