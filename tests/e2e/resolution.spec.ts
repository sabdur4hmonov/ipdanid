import { openMore, revealControl } from "./navigation";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
import { DEFAULT_EDITS } from "../../src/core/types";
import { progressFor, validateInstruction } from "../../src/core/validation";
test("192 settings survive reuse/presets, pointer geometry and actual Worker export while default160 stays unchanged", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const p = createProfile("circle", 48);
  p.threadMm = 0.1;
  const instruction = await generate({
    pixels: new Uint8Array(192 * 192 * 3).fill(150),
    resolution: 192,
    profile: p,
    lines: 200,
    mode: "dark",
    guarded: true,
  });
  const project = {
    id: crypto.randomUUID(),
    name: "192 fixture",
    edits: DEFAULT_EDITS,
    instruction,
    progress: { ...progressFor(instruction), confirmed: 3 },
  };
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await expect(
    page.getByLabel("Computation resolution", { exact: true }),
  ).toHaveValue("160");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: "192.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ schema: "iprasm.project/1", project }),
      ),
    });
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Computation resolution", { exact: true }),
  ).toHaveValue("192");
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  // Portrait enablement intentionally raises the quality ceiling; use a small explicit QA budget.
  await revealControl(page.getByLabel("Maximum lines", { exact: true }));
  await page.getByLabel("Maximum lines", { exact: true }).fill("200");
  const target = page.getByLabel("Exact generation target", { exact: true });
  await expect(target).toHaveAttribute("width", "192");
  for (const [locale, label] of [
    ["uz", "Hisoblash aniqligi"],
    ["ru", "Разрешение расчёта"],
    ["en", "Computation resolution"],
  ]) {
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("192");
  }
  const mouth = page.locator('[data-region="mouth"]');
  await mouth.scrollIntoViewIfNeeded();
  const box = JSON.parse((await mouth.getAttribute("data-box"))!);
  const r = (await mouth.boundingBox())!;
  const frame = (await page.locator(".target-frame").boundingBox())!;
  await mouth.evaluate((node) => {
    (window as any).__regionPointer = [];
    for (const kind of ["pointerdown", "pointermove"])
      node.addEventListener(kind, (event) => {
        const rect = node.closest(".target-frame")!.getBoundingClientRect();
        (window as any).__regionPointer.push({ y: (event as PointerEvent).clientY, top: rect.top, height: rect.height });
      });
  });
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 - 20 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - 20, {
      steps: 5,
    });
    await page.mouse.up();
  }
  const moved = JSON.parse((await mouth.getAttribute("data-box"))!);
  const delivered = await page.evaluate(() => {
    const values = (window as any).__regionPointer;
    const first = values[0], last = values.at(-1);
    return { pixels: last.y - first.y, normalized: (last.y-last.top)/last.height - (first.y-first.top)/first.height };
  });
  // Native mouse/CDP coordinates are rounded; verify the mapping against the
  // actual delivered pointer displacement while still checking the gesture.
  expect(Math.abs(delivered.pixels + 20)).toBeLessThanOrEqual(1);
  expect(moved.top).toBeCloseTo(box.top + (delivered.normalized * 192) / 191, 6);
  await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
  await page.locator("summary").filter({ hasText: "Saved settings" }).click();
  await revealControl(page.getByLabel("Settings name", { exact: true }));
  await page.getByLabel("Settings name", { exact: true }).fill("192 settings");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await revealControl(page.getByLabel("Computation resolution", { exact: true }));
  await page.getByLabel("Computation resolution", { exact: true }).selectOption("160");
  await revealControl(page.getByLabel("Saved settings", { exact: true }));
  await page.getByLabel("Saved settings", { exact: true }).selectOption({ label: "192 settings" });
  await expect(target).toHaveAttribute("width", "192");
  await expect(page.getByLabel("Maximum lines", { exact: true })).toHaveValue(
    "200",
  );
  expect(JSON.parse((await mouth.getAttribute("data-box"))!)).toEqual(moved);
  // A small real guarded192 Worker request, unrelated to private portrait quality.
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click({ timeout: 120000 });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const actual = JSON.parse(
    readFileSync((await (await download).path())!, "utf8"),
  ).project;
  await validateInstruction(actual.instruction);
  expect(actual.instruction.params.resolution).toBe(192);
  expect(actual.instruction.params.portrait.regions.mouth).toEqual(moved);
  expect(actual.progress.confirmed).toBe(0);
  expect(actual.instruction.algorithm).toBe("continuous-guarded/6");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.projects.v1")!),
  );
  expect(
    stored.find(
      (x: any) => x.instruction.sequenceHash === instruction.sequenceHash,
    ).progress.confirmed,
  ).toBe(3);
});
