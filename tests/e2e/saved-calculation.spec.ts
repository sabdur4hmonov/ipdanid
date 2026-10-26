import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
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
test("completed physical fit remains archived after recovery marker is cleared and page reloads", async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByTestId("advanced-photo").locator("summary").first().click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await revealControl(page.getByLabel("Portrait optimization", { exact: true }));
  await page.getByLabel("Portrait optimization", { exact: true }).selectOption("physical");
  await page
    .getByTestId("advanced-generation")
    .locator("summary")
    .first()
    .click();
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("24");
  await page.getByLabel("Maximum lines", { exact: true }).focus();
  await page.keyboard.press("Home");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  const preview = page.locator(".result-card canvas[data-sequence-hash]");
  await expect(preview).toBeVisible({ timeout: 90000 });
  const hash = (await preview.getAttribute("data-sequence-hash"))!;
  const read = (hash: string) =>
    page.evaluate(async (key) => {
      const d = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("iprasm.local-generation-inputs", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      try {
        return await new Promise<any>((resolve, reject) => {
          const r = d.transaction("inputs").objectStore("inputs").get(key);
          r.onsuccess = () =>
            resolve({
              checksum: r.result.fit.checkpoint.checksum,
              binding: r.result.fit.checkpoint.binding,
              sweeps: r.result.fit.checkpoint.sweeps,
              bytes: r.result.input.pixels.length,
              target: r.result.input.recipe.targetHash,
            });
          r.onerror = () => reject(r.error);
        });
      } finally {
        d.close();
      }
    }, hash);
  const before = await read(hash);
  expect(before.bytes).toBe(160 * 160 * 3);
  expect(before.sweeps).toBeGreaterThan(0);
  expect(before.checksum).toMatch(/^[a-f0-9]{64}$/);
  await expect(
    page.getByRole("button", {
      name: "Resume saved optimization",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await page.reload();
  expect(await read(hash)).toEqual(before);
});
test("group Continue survives reload using frozen private pixels; deleting them preserves guide and progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const Original = window.Worker;
    (window as any).__requests = [];
    window.Worker = class extends Original {
      postMessage(m: any, ...args: any[]) {
        if (m.pixels)
          (window as any).__requests.push({
            strategy: m.strategy,
            pixels: Array.from(m.pixels),
            seed: m.seed?.sequenceHash,
          });
        super.postMessage(m, ...(args as [any]));
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByTestId("mark-two-faces").click();
  await reviewEveryPerson(page);
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
  const preview = page.locator(".result-card canvas[data-sequence-hash]");
  await expect(preview).toBeVisible({ timeout: 90000 });
  const root = await preview.getAttribute("data-sequence-hash");
  const before = await page.evaluate(() => (window as any).__requests[0]);
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await expect(page.getByTestId("player-hash")).toHaveText(root!);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByTestId("continue-saved-calculation").first().click();
  await expect(page.locator(".photo-card")).toBeVisible();
  await expect(preview).toBeVisible({ timeout: 90000 });
  const next = await preview.getAttribute("data-sequence-hash");
  expect(next).not.toBe(root);
  const request = await page.evaluate(() => (window as any).__requests[0]);
  expect(request.strategy).toBe("guarded");
  expect(request.seed).toBe(root);
  expect(request.pixels).toEqual(before.pixels);
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await expect(page.getByTestId("player-hash")).toHaveText(next!);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project JSON", exact: true })
    .first()
    .click();
  const file = JSON.parse(
    readFileSync((await (await downloaded).path())!, "utf8"),
  );
  expect(file.project.progress.confirmed).toBe(0);
  expect(file.project.instruction.params.parentSequenceHash).toBe(root);
  expect(file.project.instruction.algorithm).toBe("group-optical/15");
  expect(file.pixels).toBeUndefined();
  expect(file.project.pixels).toBeUndefined();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  const cards = page.locator(".project-card");
  const original = cards.filter({ hasText: "0/" }).last();
  await original.getByTestId("delete-local-calculation").click();
  await original.getByTestId("continue-saved-calculation").click();
  await expect(page.getByRole("alert")).toContainText(
    "Exact calculation photo is unavailable",
  );
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  expect(await cards.count()).toBe(2);
  expect(errors).toEqual([]);
});
