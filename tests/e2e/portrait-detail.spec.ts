import { openMore, revealControl } from "./navigation";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("contour target toggles exactly; real Worker, preset, progress and offline exports retain the style", async ({
  page,
  context,
}, info) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    (window as any).__detailJobs = [];
    window.Worker = class extends NativeWorker {
      postMessage(m: any, ...rest: any[]) {
        if (m.pixels)
          (window as any).__detailJobs.push({
            style: m.portrait?.detailStyle,
            resolution: m.resolution,
          });
        super.postMessage(m, ...(rest as [any]));
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await openMore(page);
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  const target = page.getByLabel("Exact generation target", { exact: true }),
    original = await target.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const detail = page.getByLabel("Separate facial contours", { exact: true });
  await detail.check();
  const styled = await target.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(styled).not.toBe(original);
  await expect(
    page.getByLabel("Retain more original shading", { exact: true }),
  ).toBeChecked();
  await revealControl(page.getByLabel("Retain more original shading", { exact: true }));
  await page.getByLabel("Retain more original shading", { exact: true }).uncheck();
  expect(
    await target.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).not.toBe(styled);
  await revealControl(page.getByLabel("Retain more original shading", { exact: true }));
  await page.getByLabel("Retain more original shading", { exact: true }).check();
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    styled,
  );
  await detail.uncheck();
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    original,
  );
  await detail.check();
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("24");
  await revealControl(page.getByLabel("Maximum lines", { exact: true }));
  await page.getByLabel("Maximum lines", { exact: true }).fill("200");
  await page.getByText("Saved settings", { exact: true }).first().click();
  await revealControl(page.getByLabel("Settings name", { exact: true }));
  await page.getByLabel("Settings name", { exact: true }).fill("Exact contour preparation");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  expect(
    await page.evaluate(() => (window as any).__detailJobs.at(-1).style),
  ).toBe("contour-preparation/2");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  const previewHash = await page.getByTestId("player-hash").innerText();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("player-hash")).toHaveText(previewHash);
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Project JSON", exact: true })
      .first()
      .click(),
  ]);
  const file = JSON.parse(readFileSync((await json.path())!, "utf8"));
  expect(file.project.instruction.params.portrait.detailStyle).toBe(
    "contour-preparation/2",
  );
  expect(file.project.progress.confirmed).toBe(1);
  expect(file.project.instruction.sequenceHash).toBe(
    file.project.progress.sequenceHash,
  );
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "PDF guide", exact: true })
      .first()
      .click(),
  ]);
  expect(
    readFileSync((await pdf.path())!)
      .subarray(0, 4)
      .toString(),
  ).toBe("%PDF");
  await page.screenshot({
    path: `output/portrait-detail/${info.project.name}-offline.png`,
    fullPage: true,
  });
});
test("preserved real portrait import retains exact path/progress and contour preset survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator('input[type=file][accept=".json,.txt"]')
    .setInputFiles("output/portrait-detail/white/candidate-guide.json");
  const input = JSON.parse(
    readFileSync("output/portrait-detail/white/candidate.json", "utf8"),
  );
  await expect(page.getByTestId("player-hash")).toHaveText(
    input.project.instruction.sequenceHash,
  );
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  await openMore(page);
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await expect(
    page.getByLabel("Separate facial contours", { exact: true }),
  ).toBeChecked();
  await page.getByText("Saved settings", { exact: true }).first().click();
  await revealControl(page.getByLabel("Settings name", { exact: true }));
  await page.getByLabel("Settings name", { exact: true }).fill("Imported contour");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.reload();
  await openMore(page);
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByText("Saved settings", { exact: true }).first().click();
  const select = page.getByLabel("Saved settings", { exact: true });
  const id = await select.locator("option").last().getAttribute("value");
  await select.selectOption(id!);
  await expect(
    page.getByLabel("Separate facial contours", { exact: true }),
  ).toBeChecked();
});
