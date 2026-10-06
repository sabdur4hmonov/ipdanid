import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { validateInstruction } from "../../src/core/validation";
test("real physical Worker checkpoints survive reload; exact recovery, separate simplification, preview/player/export and old progress agree", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.addInitScript(() => {
    const Native = Worker;
    (window as any).__interrupted = false;
    window.Worker = class extends Native {
      constructor(...args: any[]) {
        super(args[0], args[1]);
        this.addEventListener("message", (e) => {
          if (
            e.data.type === "fit-checkpoint" &&
            !(window as any).__interrupted
          ) {
            (window as any).__interrupted = true;
            setTimeout(() => this.terminate(), 0);
          }
        });
      }
    };
  });
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page
    .getByLabel("Portrait optimization", { exact: true })
    .selectOption("physical");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Number of pins", { exact: true }).fill("48");
  await page.getByLabel("Thread thickness (mm)", { exact: true }).fill("0.1");
  await page.getByLabel("Available thread (m)", { exact: true }).fill("1");
  await page.getByLabel("Maximum lines", { exact: true }).fill("1200");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Resume saved optimization",
      exact: true,
    }),
  ).toBeVisible({ timeout: 120000 });
  await page.reload();
  // The interrupted Worker above is only installed in the original page context.
  await page.evaluate(() => {
    (window as any).__interrupted = true;
  });
  await page.getByLabel("Language").selectOption("en");
  await expect(
    page.getByRole("button", {
      name: "Resume saved optimization",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume saved optimization", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await expect(
    page.getByRole("button", {
      name: "Resume saved optimization",
      exact: true,
    }),
  ).toHaveCount(0);
  const hash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const old = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(old.instruction);
  expect(old.instruction.algorithm).toBe("density-physical/8");
  expect(old.instruction.params.requestedLines).toBe(1200);
  expect(old.instruction.sequenceHash).toBe(hash);
  expect(old.progress.confirmed).toBe(0);
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  // Recovery works without reloading a photograph. Select the original sample for
  // the separate simplifier, which still must pass exact processed-target identity.
  await page
    .locator("nav")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Quality-preserving assembly simplification (experimental)",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeHidden({ timeout: 120000 });
  const tabs = page.locator(".variant-tabs button");
  expect(await tabs.count()).toBeGreaterThan(1);
  const simplifiedHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  expect(simplifiedHash).not.toBe(hash);
  await tabs.first().click();
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    hash!,
  );
  await tabs.last().click();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const fresh = JSON.parse(
    readFileSync((await (await download).path())!, "utf8"),
  ).project;
  await validateInstruction(fresh.instruction);
  expect(fresh.instruction.algorithm).toBe("assembly-prune/9");
  expect(fresh.instruction.sequenceHash).toBe(simplifiedHash);
  expect(fresh.progress.confirmed).toBe(0);
  const prior = await page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!).find(
        (p: any) => p.id === id,
      ),
    old.id,
  );
  expect(prior.progress.confirmed).toBe(1);
  expect(prior.instruction).toEqual(old.instruction);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.context().setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .first()
    .click();
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    simplifiedHash!,
  );
  const pdf = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PDF guide", exact: true })
    .first()
    .click();
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
  await page.context().setOffline(false);
});
