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

test("explicit extension controls survive local reload and real Worker recovery/export", async ({
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
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
  };
  const seed = await generate({ ...o, lines: 40, guarded: true }),
    physical = defaultPhysicalContrast();
  let original!: DensityCheckpoint;
  const reference = await generateDensity(
    { ...o, seed },
    {
      physical,
      edgeWeight: 2,
      sweeps: 2,
      onCheckpoint: (s) => {
        original = s;
      },
    },
  );
  const extension = { checkpoint: original, priorSweepLimit: 2, reference },
    tuning = { physical, edgeWeight: 2, sweeps: 4, extension };
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
  expect(checkpoint!.sweeps).toBe(3);
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
        strategy: "physical",
        edits: DEFAULT_EDITS,
        name: "Explicit convergence QA",
        extension,
        totalSweeps: 4,
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
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const project = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(project.instruction);
  expect(project.instruction.sequenceHash).toBe(expected.sequenceHash);
  expect(project.instruction.params.optimization.convergence).toMatchObject({
    priorSweeps: 2,
    additionalSweeps: 2,
    plannedTotalSweeps: 4,
  });
  expect(project.progress.confirmed).toBe(0);
  expect(project.instruction.metrics.densityFit.sweeps).toBe(4);
});
