import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const root = JSON.parse(
  readFileSync("output/portrait-resolved/candidate.json", "utf8"),
).project.instruction;
const expected = JSON.parse(
  readFileSync("output/head-quality/cycles.json", "utf8"),
).project.instruction;
const head = JSON.parse(
  readFileSync("output/head-quality/manual-regions.json", "utf8"),
).selection;
const checkpoint = JSON.parse(
  readFileSync("output/test-readiness/hair-latest-state.json", "utf8"),
);
const pixels = Array.from(
  readFileSync("output/portrait-resolved/target-320.bin"),
);
async function installRecovery(page: Page, legacy = false) {
  await page.evaluate(
    async ({ root, head, checkpoint, pixels, legacy, expected }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("iprasm.optimizer-recovery", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("stages");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction("stages", "readwrite");
        t.objectStore("stages").put(
          {
            version: "iprasm.optimizer-recovery/1",
            seed: root,
            hairSeed: legacy ? expected : root,
            ...(!legacy ? { hairCheckpoint: checkpoint } : {}),
            profile: root.profile,
            portrait: root.params.portrait,
            resolution: 320,
            mode: root.params.mode,
            pixels: new Uint8Array(pixels),
            lines: root.params.requestedLines,
            strategy: "basis",
            head,
            headRefine: true,
            edits: {
              zoom: 1,
              panX: 0,
              panY: 0,
              rotation: 0,
              contrast: 1,
              brightness: 0,
              invert: false,
            },
            name: "Recovered portrait test",
          },
          "physical",
        );
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
      db.close();
    },
    { root, head, checkpoint, pixels, legacy, expected },
  );
  await page.reload();
}
async function storedRecovery(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("iprasm.optimizer-recovery", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const value = await new Promise<any>((resolve, reject) => {
      const r = db
        .transaction("stages", "readonly")
        .objectStore("stages")
        .get("physical");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return value;
  });
}

test("exact hair search survives no-photo reload, touch/mouse cancellation and offline saved export", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await installRecovery(page);
  await expect(page.getByTestId("shape-crop")).toHaveCount(0);
  const resume = page.getByRole("button", {
    name: "Resume saved optimization",
    exact: true,
  });
  await expect(resume).toBeVisible();
  if (info.project.name === "mobile-browser") await resume.tap();
  else await resume.click();
  const cancel = page.getByRole("button", { name: "Cancel", exact: true });
  await expect(cancel).toBeVisible();
  if (info.project.name === "mobile-browser") await cancel.tap();
  else await cancel.click();
  await expect(resume).toBeEnabled();
  await page.reload();
  await expect(resume).toBeVisible();
  const saved = await storedRecovery(page);
  expect(saved.hairSeed.sequenceHash).toBe(root.sequenceHash);
  expect(saved.hairCheckpoint.evaluations).toBe(checkpoint.evaluations);
  await resume.click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    expected.sequenceHash,
  );
  await expect(page.getByTestId("optimizer-recovery")).toHaveCount(0);
  expect(await storedRecovery(page)).toBeUndefined();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(
    expected.sequenceHash,
  );
  await expect(page.getByTestId("confirmed-step")).toContainText("0/1660");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Project JSON", exact: true }).click(),
  ]);
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(file.project.instruction.sequenceHash).toBe(expected.sequenceHash);
  expect(file.project.instruction.segments).toEqual(expected.segments);
  expect(file.project.instruction.params).toEqual(expected.params);
  expect(file.project.progress.confirmed).toBe(0);
  writeFileSync(
    `output/test-readiness/${info.project.name}-recovered.json`,
    JSON.stringify(file, null, 2),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "My projects", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction
          .sequenceHash,
    ),
  ).toBe(expected.sequenceHash);
});

test("legacy partial hair guide remains exportable without pretending its search allowance can resume", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await installRecovery(page, true);
  await expect(
    page.getByRole("button", {
      name: "Resume saved optimization",
      exact: true,
    }),
  ).toHaveCount(0);
  for (const [locale, label] of [
    ["uz", "Tiklangan yo‘riqnomani alohida saqlash"],
    ["ru", "Сохранить восстановленную инструкцию отдельно"],
    ["en", "Keep recovered guide separately"],
  ]) {
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
  const keep = page.getByRole("button", {
    name: "Keep recovered guide separately",
    exact: true,
  });
  if (info.project.name === "mobile-browser") await keep.tap();
  else await keep.click();
  await expect(page.getByTestId("player-hash")).toHaveText(
    expected.sequenceHash,
  );
  await expect(page.getByTestId("confirmed-step")).toContainText("0/1660");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Project JSON", exact: true }).click(),
  ]);
  expect(
    JSON.parse(readFileSync((await download.path())!, "utf8")).project
      .instruction,
  ).toEqual(expected);
  expect((await storedRecovery(page)).hairSeed.sequenceHash).toBe(
    expected.sequenceHash,
  );
});

test("production worker rejects checkpoint/head and exact-target mismatches with job association intact", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const worker = readdirSync("dist/assets").find((n) =>
    n.startsWith("generator.worker-"),
  )!;
  for (const mismatch of ["head", "target"]) {
    const result = await page.evaluate(
      async ({ root, head, checkpoint, pixels, worker, mismatch }) =>
        new Promise<any>((resolve, reject) => {
          const w = new Worker("/assets/" + worker, { type: "module" });
          const timeout = setTimeout(() => {
            w.terminate();
            reject(Error("Worker did not reject invalid recovery"));
          }, 30000);
          w.onmessage = ({ data }) => {
            if (data.type === "error" || data.type === "done") {
              clearTimeout(timeout);
              w.terminate();
              resolve(data);
            }
          };
          const changed = new Uint8Array(pixels);
          if (mismatch === "target") changed[0] ^= 1;
          w.postMessage({
            jobId: "invalid-" + mismatch,
            pixels: changed,
            profile: root.profile,
            portrait: root.params.portrait,
            resolution: 320,
            mode: root.params.mode,
            lines: root.params.requestedLines,
            strategy: "basis",
            head: mismatch === "head" ? { ...head, weight: 7 } : head,
            hairSeed: root,
            hairResume: checkpoint,
            headRefine: true,
          });
        }),
      { root, head, checkpoint, pixels, worker, mismatch },
    );
    expect(result.type).toBe("error");
    expect(result.jobId).toBe("invalid-" + mismatch);
    expect(result.message).toContain(
      mismatch === "head" ? "checkpoint" : "target",
    );
  }
});
