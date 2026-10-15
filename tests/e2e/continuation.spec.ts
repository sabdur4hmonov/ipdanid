import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
import { validateInstruction } from "../../src/core/validation";
test("continuing an older variant after changing the photo uses its recorded source/resolution and keeps old progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    const Original = Worker;
    (window as any).__continuationRequests = [];
    (window as any).__continuationTerminals = [];
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", ({ data }) => {
          if (["done", "error"].includes(data.type))
            (window as any).__continuationTerminals.push({ type: data.type, message: data.message, hash: data.instruction?.sequenceHash, parent: data.instruction?.params.parentSequenceHash });
        });
      }
      postMessage(data: any) {
        if (data.profile) (window as any).__continuationRequests.push({ strategy: data.strategy, seed: data.seed?.sequenceHash, resolution: data.resolution });
        super.postMessage(data);
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await revealControl(page.getByLabel("Face region Top", { exact: true }));
  await page.getByLabel("Face region Top", { exact: true }).fill("0.2");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await revealControl(page.getByLabel("Maximum lines", { exact: true }));
  // Leave room for the density continuation's real connecting strands;
  // a 400-strand seed at a 400-strand cap legitimately refuses routing.
  await page.getByLabel("Maximum lines", { exact: true }).fill("2000");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  const oldHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("2/");
  const old = await page.evaluate(
    (hash) =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!).find(
        (p: any) => p.instruction.sequenceHash === hash,
      ),
    oldHash,
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/orientation-6.jpg");
  await expect(page.getByRole("button", { name: "orientation-6.jpg", exact: true, includeHidden: true })).toBeAttached();
  // This source-change test does not need asynchronous human inference.
  await page.getByRole("radio", { name: /^Keep full image/ }).click();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status", /ready|failed|manual/, { timeout: 60000 },
  );
  await revealControl(page.getByLabel("Computation resolution", { exact: true }));
  await page.getByLabel("Computation resolution", { exact: true }).selectOption("192");
  // Current solvers may reach a plateau, so continuation is always entered
  // through the saved guide rather than a compute-limit-only result button.
  await page.locator("nav").getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByTestId("continue-saved-calculation").first().click();
  await expect.poll(() => page.evaluate(() => (window as any).__continuationRequests), { timeout: 15000 }).toHaveLength(2);
  await expect.poll(() => page.evaluate(() => (window as any).__continuationTerminals), { timeout: 120000 }).toHaveLength(2);
  const terminal = await page.evaluate(() => (window as any).__continuationTerminals.at(-1));
  expect(terminal.type, JSON.stringify(terminal)).toBe("done");
  expect(terminal).toMatchObject({ type: "done", parent: oldHash });
  await expect(page.locator(".result-card canvas[data-sequence-hash]")).not.toHaveAttribute(
    "data-sequence-hash", oldHash!, { timeout: 120000 },
  );
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeHidden({ timeout: 120000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".variant-tabs button")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const actual = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(actual.instruction);
  expect(actual.instruction.imageHash).toBe(old.instruction.imageHash);
  expect(actual.instruction.profile).toEqual(old.instruction.profile);
  expect(actual.instruction.params.portrait).toEqual(
    old.instruction.params.portrait,
  );
  expect(actual.instruction.params.resolution).toBe(160);
  expect(actual.instruction.params.parentSequenceHash).toBe(oldHash);
  expect(actual.instruction.sequenceHash).not.toBe(oldHash);
  expect(actual.progress.confirmed).toBe(0);
  const preserved = await page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!).find(
        (p: any) => p.id === id,
      ),
    old.id,
  );
  expect(preserved).toEqual(old);
});
