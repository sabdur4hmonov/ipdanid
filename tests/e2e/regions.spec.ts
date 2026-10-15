import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";

test("independent mouse/touch regions, localized estimates, persistence and rapid immutable variant selection", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  for (const [locale, text] of [
    ["uz", "faqat taxmin"],
    ["ru", "приблизительные"],
    ["en", "proportional estimates"],
  ]) {
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(page.getByTestId("region-editor")).toContainText(text);
  }
  const mouth = page.locator('[data-region="mouth"]');
  const original = JSON.parse((await mouth.getAttribute("data-box"))!);
  const nose = await page
    .locator('[data-region="nose"]')
    .getAttribute("data-box");
  await mouth.scrollIntoViewIfNeeded();
  const r = (await mouth.boundingBox())!;
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
  expect(moved.top).toBeLessThan(original.top);
  expect(
    await page.locator('[data-region="nose"]').getAttribute("data-box"),
  ).toBe(nose);
  const handle = mouth.getByRole("button", { name: "Mouth Resize" });
  await handle.scrollIntoViewIfNeeded();
  const h = (await handle.boundingBox())!;
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: h.x + 12, y: h.y + 12 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: h.x + 24, y: h.y + 22 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(h.x + 12, h.y + 12);
    await page.mouse.down();
    await page.mouse.move(h.x + 24, h.y + 22, { steps: 3 });
    await page.mouse.up();
  }
  expect(
    JSON.parse((await mouth.getAttribute("data-box"))!).width,
  ).toBeGreaterThan(moved.width);
  const expected = JSON.parse((await mouth.getAttribute("data-box"))!);
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("48");
  const hashes: string[] = [],
    canvases: string[] = [];
  for (const count of [200, 400]) {
    await revealControl(page.getByLabel("Maximum lines", { exact: true }));
    await page.getByLabel("Maximum lines", { exact: true }).fill(String(count));
    await page
      .getByRole("button", { name: "Calculate thread path", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeHidden({ timeout: 120000 });
    hashes.push(
      (await page
        .locator("canvas[data-sequence-hash]")
        .getAttribute("data-sequence-hash"))!,
    );
    canvases.push(
      await page
        .locator("canvas[data-sequence-hash]")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
    );
  }
  expect(hashes[0]).not.toBe(hashes[1]);
  expect(canvases[0]).not.toBe(canvases[1]);
  for (const index of [0, 1, 0, 1, 0]) {
    await page.locator(".variant-tabs button").nth(index).click();
    await expect(page.getByTestId("variant-audit")).toHaveAttribute(
      "data-sequence-hash",
      hashes[index],
    );
    await expect
      .poll(() =>
        page
          .locator("canvas[data-sequence-hash]")
          .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
      )
      .toBe(canvases[index]);
  }
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const project = JSON.parse(
    readFileSync((await (await d).path())!, "utf8"),
  ).project;
  expect(project.instruction.sequenceHash).toBe(hashes[0]);
  expect(project.instruction.params.requestedLines).toBe(200);
  expect(project.instruction.params.portrait.regions.mouth).toEqual(expected);
  expect(project.instruction.params.portrait.regions.reference).toBe(
    "processed-target/sample-centers-v1",
  );
  expect(project.progress.confirmed).toBe(0);
  await page
    .locator("nav")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  const beforeCrop = JSON.parse(
    (await page.getByTestId("shape-crop").getAttribute("data-portrait"))!,
  );
  await revealControl(page.getByLabel("Zoom", { exact: true }));
  await page.getByLabel("Zoom", { exact: true }).fill("1.2");
  await expect(page.getByTestId("region-editor")).toContainText(
    "Manually positioned regions",
  );
  const afterCrop = JSON.parse(
    (await page.getByTestId("shape-crop").getAttribute("data-portrait"))!,
  );
  expect(afterCrop.regions.mouth.left).toBeCloseTo(
    0.5 + (beforeCrop.regions.mouth.left - 0.5) * 1.2,
    5,
  );
  expect(afterCrop.regions.mouth.width).toBeCloseTo(
    beforeCrop.regions.mouth.width * 1.2,
    5,
  );
  expect(afterCrop.regions.reference).toBe(beforeCrop.regions.reference);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    hashes[0],
  );
});

test("cancel during asynchronous validation and reject mismatched Worker jobs", async ({
  page,
}) => {
  const options = {
    pixels: new Uint8Array(32 * 32 * 3).fill(150),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 12,
    mode: "dark" as const,
  };
  const first = await generate(options),
    second = await generate({ ...options, lines: 20 });
  // Valid generated instructions, with deliberately delayed main-thread validation. This is a scheduling test.
  await page.addInitScript(
    ({ first, second }) => {
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      let initial = true,
        release: () => void;
      (window as any).releaseValidation = () => release?.();
      crypto.subtle.digest = async (
        ...args: Parameters<SubtleCrypto["digest"]>
      ) => {
        // Target/recipe hashes are also computed on photo selection now.
        // Delay only immutable instruction validation, the event under test.
        let sequence = false;
        try {
          const payload = JSON.parse(new TextDecoder().decode(args[1]));
          sequence = Array.isArray(payload.segments) && typeof payload.algorithm === "string";
        } catch { /* image bytes are not a sequence payload */ }
        if (initial && sequence) {
          initial = false;
          (window as any).validationStarted = true;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }
        const result = await digest(...args);
        if (sequence) (window as any).validationReturned =
          ((window as any).validationReturned ?? 0) + 1;
        return result;
      };
      let jobs = 0;
      (window as any).Worker = class {
        onmessage: ((e: any) => void) | null = null;
        onerror = null;
        terminate() {}
        postMessage(data: any) {
          const index = jobs++;
          setTimeout(() => {
            this.onmessage?.({
              data: {
                type: "done",
                jobId: data.jobId + 100,
                instruction: first,
              },
            });
            this.onmessage?.({
              data: {
                type: "done",
                jobId: data.jobId,
                instruction: index ? second : first,
              },
            });
          }, 10);
        }
      };
    },
    { first, second },
  );
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page.waitForFunction(() => (window as any).validationStarted === true);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    second.sequenceHash,
  );
  await page.evaluate(() => (window as any).releaseValidation());
  await page.waitForFunction(() => (window as any).validationReturned === 2);
  await expect(page.locator(".variant-tabs button")).toHaveCount(1);
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    second.sequenceHash,
  );
});
