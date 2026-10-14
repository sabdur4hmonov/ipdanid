import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { DEFAULT_ANATOMICAL_IMPORTANCE } from "../../src/core/anatomical-importance";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createProfile } from "../../src/core/geometry";
import { generate } from "../../src/core/engine";
import {
  generateDensity,
  type DensityCheckpoint,
} from "../../src/core/density";
import { DEFAULT_PORTRAIT } from "../../src/core/portrait";
import { defaultPhysicalContrast } from "../../src/core/physical-contrast";
import { DEFAULT_EDITS } from "../../src/core/types";
import { validateInstruction } from "../../src/core/validation";

test("manual anatomical objective survives reload and exact real Worker recovery/export", async ({
  page,
}) => {
  const profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const pixels = Uint8Array.from(
    { length: 32 * 32 * 3 },
    (_, k) => 120 + (Math.floor(k / 3) % 100),
  );
  const o = {
    pixels,
    profile,
    resolution: 32,
    mode: "dark" as const,
    lines: 800,
    portrait: {
      ...DEFAULT_PORTRAIT,
      enabled: true,
      regions: {
        reference: "processed-target/sample-centers-v1" as const,
        placement: "manual" as const,
        eyes: { left: 0.3, top: 0.4, width: 0.4, height: 0.1 },
        nose: { left: 0.4, top: 0.55, width: 0.2, height: 0.15 },
        mouth: { left: 0.3, top: 0.75, width: 0.4, height: 0.1 },
      },
    },
  };
  const basis = await generate({ ...o, lines: 40, guarded: true }),
    physical = defaultPhysicalContrast();
  const seed = await generateDensity(
    { ...o, seed: basis },
    { physical, edgeWeight: 2, sweeps: 3 },
  );
  const tuning = {
    physical,
    edgeWeight: 2,
    sweeps: 3,
    anatomy: DEFAULT_ANATOMICAL_IMPORTANCE,
  };
  const expected = await generateDensity({ ...o, seed }, tuning);
  let checkpoint: DensityCheckpoint | undefined;
  await expect(
    generateDensity(
      { ...o, seed, cancelled: () => !!checkpoint },
      {
        ...tuning,
        onCheckpoint: (s) => {
          checkpoint = s;
        },
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(checkpoint!.sweeps).toBe(1);
  await page.goto("/");
  await page.evaluate(
    async ({ pixels, record }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("iprasm.optimizer-recovery", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("stages");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction("stages", "readwrite");
        t.objectStore("stages").put(
          { ...record, pixels: new Uint8Array(pixels) },
          "physical",
        );
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
      db.close();
    },
    {
      pixels: [...pixels],
      record: {
        version: "iprasm.optimizer-recovery/1",
        checkpoint,
        seed,
        lines: 800,
        strategy: "anatomy",
        anatomy: DEFAULT_ANATOMICAL_IMPORTANCE,
        edits: DEFAULT_EDITS,
        name: "Manual anatomy recovery QA",
      },
    },
  );
  await page.reload();
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page
    .getByRole("button", { name: "Resume saved optimization", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  const preview = page.locator("canvas[data-sequence-hash]");
  await expect(preview).toHaveAttribute(
    "data-sequence-hash",
    expected.sequenceHash,
  );
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const project = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(project.instruction);
  expect(project.instruction.sequenceHash).toBe(expected.sequenceHash);
  expect(project.instruction.algorithm).toBe("density-anatomy/10");
  expect(project.instruction.params.optimization.anatomy).toEqual(
    DEFAULT_ANATOMICAL_IMPORTANCE,
  );
  expect(project.progress.confirmed).toBe(0);
  expect(project.instruction.metrics.densityFit.sweeps).toBe(
    expected.metrics.densityFit!.sweeps,
  );
});
test("source-matched anatomy action creates a separate variant and preserves saved progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  const profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const portrait = {
    ...DEFAULT_PORTRAIT,
    enabled: true,
    regions: {
      reference: "processed-target/sample-centers-v1" as const,
      placement: "manual" as const,
      eyes: { left: 0.3, top: 0.4, width: 0.4, height: 0.1 },
      nose: { left: 0.4, top: 0.55, width: 0.2, height: 0.15 },
      mouth: { left: 0.3, top: 0.75, width: 0.4, height: 0.1 },
    },
  };
  const settings = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(180),
    profile,
    resolution: 32,
    lines: 200,
    mode: "dark",
    portrait,
    guarded: true,
  });
  const fixture = {
    id: crypto.randomUUID(),
    name: "Small immutable settings QA",
    edits: DEFAULT_EDITS,
    instruction: settings,
    progress: {
      sequenceHash: settings.sequenceHash,
      confirmed: 3,
      revision: 1,
      updatedAt: new Date().toISOString(),
    },
  };
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({
      name: "fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ schema: "iprasm.project/1", project: fixture }),
      ),
    });
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByLabel("Portrait optimization", { exact: true }));
  await page.getByLabel("Portrait optimization", { exact: true }).selectOption("physical");
  await revealControl(page.getByLabel("Eyes Left", { exact: true }));
  await page.getByLabel("Eyes Left", { exact: true }).fill("0.3");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  const originalHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .getByRole("button", {
      name: "Nose and lip priority (v10, experimental)",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeHidden({ timeout: 120000 });
  const hash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  expect(hash).not.toBe(originalHash);
  const tabs = page.locator(".variant-tabs button");
  await tabs.nth(1).click();
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    originalHash!,
  );
  await tabs.last().click();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const fresh = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(fresh.instruction);
  expect(fresh.instruction.algorithm).toBe("density-anatomy/10");
  expect(fresh.instruction.sequenceHash).toBe(hash);
  expect(fresh.progress.confirmed).toBe(0);
  const old = await page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!).find(
        (p: any) => p.instruction.sequenceHash === id,
      ),
    settings.sequenceHash,
  );
  expect(old.instruction).toEqual(settings);
  expect(old.progress.confirmed).toBe(3);
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Portrait optimization", { exact: true }),
  ).toHaveValue("anatomy");
  await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
  await page.locator("summary").filter({ hasText: "Saved settings" }).click();
  await revealControl(page.getByLabel("Settings name", { exact: true }));
  await page.getByLabel("Settings name", { exact: true }).fill("Saved anatomy priority");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.presets.v1") ?? "[]")[0]
            ?.name,
      ),
    )
    .toBe("Saved anatomy priority");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.presets.v1")!),
  );
  expect(stored[0].settings.portraitSolver).toBe("anatomy");
  expect(stored[0].settings.anatomy).toEqual(DEFAULT_ANATOMICAL_IMPORTANCE);
  await page.reload();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.locator("summary").filter({ hasText: "Saved settings" }));
  await page.locator("summary").filter({ hasText: "Saved settings" }).click();
  await revealControl(page.getByLabel("Saved settings", { exact: true }));
  await page.getByLabel("Saved settings", { exact: true }).selectOption(stored[0].id);
  await expect(
    page.getByLabel("Portrait optimization", { exact: true }),
  ).toHaveValue("anatomy");
  expect(errors).toEqual([]);
});
