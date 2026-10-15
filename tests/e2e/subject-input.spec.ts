import { unlockIfNeeded } from "./kit-access";
import { test, expect, type Page } from "./legacy-test";
import { readFileSync, readdirSync } from "node:fs";
import { validateInstruction } from "../../src/core/validation";
import { makeSubjectPlan } from "../../src/core/subject-plan";
import { DEFAULT_PORTRAIT } from "../../src/core/portrait";
import { createProfile } from "../../src/core/geometry";
import { DEFAULT_EDITS } from "../../src/core/types";
import {
  syntheticSubject,
  type SyntheticSubject,
} from "../fixtures/synthetic-subjects";

// Synthetic fixtures only. Service workers are blocked so local routes also
// apply to worker requests; the app itself does not require the offline shell.
test.use({ serviceWorkers: "block" });
const N = 160;

async function start(page: Page) {
  await page.addInitScript(() => {
    const Original = window.Worker;
    (window as any).__generation = [];
    window.Worker = class extends Original {
      postMessage(m: any, ...args: any[]) {
        if (m?.pixels && m.profile)
          (window as any).__generation.push({
            strategy: m.strategy,
            pixels: Array.from(m.pixels),
            subject: m.subject,
            portrait: m.portrait,
          });
        super.postMessage(m, ...(args as [any]));
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
}
async function uploadFixture(page: Page, kind: SyntheticSubject, name: string) {
  const pixels = Array.from(syntheticSubject(kind, N));
  const png = await page.evaluate(
    ({ pixels, n }) => {
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const ctx = c.getContext("2d")!,
        data = ctx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) {
        data.data[i * 4] = pixels[i * 3];
        data.data[i * 4 + 1] = pixels[i * 3 + 1];
        data.data[i * 4 + 2] = pixels[i * 3 + 2];
        data.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    },
    { pixels, n: N },
  );
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name,
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  return pixels;
}
const card = (page: Page, kind: string) =>
  page.getByTestId("subject-kind").locator(`[data-kind="${kind}"]`);
const generateButton = (page: Page) => page.getByTestId("generate");
async function fewestLines(page: Page) {
  const panel = page.getByTestId("advanced-generation");
  if (!(await panel.evaluate((d: HTMLDetailsElement) => d.open)))
    await panel.locator("summary").first().click();
  await page.getByLabel("Maximum lines", { exact: true }).focus();
  await page.keyboard.press("Home");
}
async function exportProject(page: Page) {
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Project JSON", exact: true })
      .first()
      .click(),
  ]);
  return JSON.parse(readFileSync((await json.path())!, "utf8"));
}
// Replaces the bundled photo-analysis worker with a deterministic stand-in so
// detector behaviour (two faces, slow response) is reproducible without models.
async function fakeAnalysis(
  page: Page,
  { delay, keep }: { delay: number; keep: number },
) {
  const face = (left: number) => ({
    face: { left, top: 0.3, width: 0.2, height: 0.36 },
    eyes: { left: left + 0.03, top: 0.39, width: 0.14, height: 0.05 },
    nose: { left: left + 0.07, top: 0.46, width: 0.06, height: 0.08 },
    mouth: { left: left + 0.05, top: 0.57, width: 0.1, height: 0.04 },
  });
  const faces = [face(0.25), face(0.55)];
  const body = `
    self.onmessage = (e) => {
      const { id, image, cancel, dispose } = e.data;
      if (cancel || dispose || !image) return;
      image.close();
      setTimeout(() => {
        const values = new Float32Array(64).fill(${keep});
        self.postMessage({ id, mask: { width: 8, height: 8, values },
          faces: ${JSON.stringify(faces)}, faceUnavailable: false,
          cleanupUnavailable: false, analysisTurn: 0 }, [values.buffer]);
      }, ${delay});
    };`;
  await page.route("**/assets/photo-prepare.worker-*.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body }),
  );
}

test("car, dog and object keep their original pixels and never request person models", async ({
  page,
}) => {
  test.setTimeout(240000);
  const models: string[] = [];
  page.on("request", (r) => {
    if (/selfie_multiclass|face_landmarker|deeplab/.test(r.url()))
      models.push(r.url());
  });
  await start(page);
  for (const [kind, fixture] of [
    ["vehicle", "car"],
    ["animal", "dog"],
    ["object", "object"],
  ] as const) {
    const pixels = await uploadFixture(page, fixture, `${fixture}.png`);
    await card(page, kind).click();
    await expect(card(page, kind)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("subject-kind")).toHaveAttribute(
      "data-value",
      kind,
    );
    await expect(page.getByTestId("background-status")).toHaveAttribute(
      "data-status",
      "manual",
    );
    // No person-only UI for general subjects.
    await expect(page.getByTestId("portrait-quality-setup")).toHaveCount(0);
    await expect(page.getByTestId("mark-two-faces")).toHaveCount(0);
    await expect(page.getByTestId("subject-advice")).toBeVisible();
    await fewestLines(page);
    await expect(generateButton(page)).toBeEnabled();
    const before = await page.evaluate(
      () => (window as any).__generation.length,
    );
    await generateButton(page).click();
    const preview = page.locator(".result-card canvas[data-sequence-hash]");
    await expect(preview).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId("result-subject")).toHaveAttribute(
      "data-kind",
      kind,
    );
    const sent = await page.evaluate(
      (k) => (window as any).__generation[k],
      before,
    );
    expect(sent.pixels).toEqual(pixels);
    expect(sent.subject.kind).toBe(kind);
    expect(sent.subject.preparation).toBe("original");
    expect(sent.portrait?.enabled ?? false).toBe(false);
  }
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const file = await exportProject(page);
  const i = file.project.instruction;
  await validateInstruction(i);
  expect(i.params.subject.kind).toBe("object");
  expect(i.params.portrait).toBeUndefined();
  // Reload persistence: the immutable plan is part of the saved guide.
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  const reloaded = await exportProject(page);
  expect(reloaded.project.instruction.params.subject).toEqual(i.params.subject);
  expect(reloaded.project.instruction.sequenceHash).toBe(i.sequenceHash);
  expect(models).toEqual([]);
});

test("kind change while analysis is pending ignores the stale mask and faces", async ({
  page,
}) => {
  test.setTimeout(120000);
  // The stale response would whiten the whole photo and report two faces.
  await fakeAnalysis(page, { delay: 1500, keep: 0 });
  await start(page);
  // Photo-first start: no subject cards until a photo is loaded.
  await expect(page.getByTestId("subject-kind")).toHaveCount(0);
  await uploadFixture(page, "dog", "dog.png");
  await expect(page.getByTestId("subject-kind")).toHaveAttribute(
    "data-value",
    "whole-image",
  );
  await card(page, "people").click();
  const status = page.getByTestId("background-status");
  await expect(status).toHaveAttribute("data-status", "processing");
  await expect(generateButton(page)).toBeDisabled();
  const edited = page.getByLabel("Edited photo", { exact: true });
  const original = await edited.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await card(page, "animal").click();
  await expect(status).toHaveAttribute("data-status", "manual");
  await expect(generateButton(page)).toBeEnabled();
  await page.waitForTimeout(3000);
  await expect(status).toHaveAttribute("data-status", "manual");
  expect(await edited.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    original,
  );
  await expect(page.getByTestId("apply-people-faces")).toHaveCount(0);
  // Back to people: a fresh analysis runs for the current photo and kind.
  await card(page, "people").click();
  await expect(status).toHaveAttribute("data-status", "ready", {
    timeout: 15000,
  });
  await expect(page.getByTestId("apply-people-faces")).toBeVisible();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .not.toBe(original);
  // And away again: the people mask is not reused for the animal.
  await card(page, "animal").click();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(original);
});

test("third person added when two were detected; review gates each person; locales; reload", async ({
  page,
}) => {
  test.setTimeout(240000);
  await fakeAnalysis(page, { delay: 0, keep: 1 });
  await start(page);
  await uploadFixture(page, "object", "group.png");
  await card(page, "people").click();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
  );
  await page.getByTestId("apply-people-faces").click();
  const blocked = page.getByTestId("people-review-blocked");
  await expect(blocked).toContainText("person 1, 2");
  await expect(generateButton(page)).toBeDisabled();
  const advanced = page.getByTestId("advanced-photo");
  if (!(await advanced.evaluate((d: HTMLDetailsElement) => d.open)))
    await advanced.locator("summary").first().click();
  const people = page.getByTestId("people-region-editor");
  await expect(people).toHaveAttribute("data-count", "2");
  await people.getByTestId("add-person").click();
  await expect(people).toHaveAttribute("data-count", "3");
  await expect(people.getByTestId("add-person")).toBeDisabled();
  await expect(blocked).toContainText("person 1, 2, 3");
  const ids = await people
    .getByTestId("person-status")
    .evaluateAll((e) => e.map((x) => x.getAttribute("data-person-id")));
  expect(new Set(ids).size).toBe(3);
  const review = async (k: number) => {
    await people.getByTestId("person-status").nth(k).locator("button").click();
    await people.getByTestId("review-person").click();
    await expect(people.getByTestId("person-status").nth(k)).toHaveAttribute(
      "data-reviewed",
      "true",
    );
  };
  await review(0);
  await review(1);
  await expect(blocked).toContainText("person 3");
  await expect(blocked).not.toContainText("1,");
  // Moving person 2 invalidates only person 2.
  await people.getByTestId("person-status").nth(1).locator("button").click();
  const left = people.locator('input[type="number"]').first();
  await left.fill(String(+(await left.inputValue()) + 0.01));
  await expect(people.getByTestId("person-status").nth(1)).toHaveAttribute(
    "data-reviewed",
    "false",
  );
  await expect(people.getByTestId("person-status").nth(0)).toHaveAttribute(
    "data-reviewed",
    "true",
  );
  await expect(blocked).toContainText("person 2, 3");
  // Locale changes re-render cards and the gate message.
  for (const [lang, gate, vehicle] of [
    ["uz", "odam 2, 3", "Mashina"],
    ["uz-Cyrl", "одам 2, 3", "Машина"],
    ["ru", "человек 2, 3", "Автомобиль"],
    ["en", "person 2, 3", "Vehicle"],
  ]) {
    await page.getByLabel("Language", { exact: true }).selectOption(lang);
    await expect(blocked).toContainText(gate);
    await expect(card(page, "vehicle")).toContainText(vehicle);
  }
  await review(1);
  await review(2);
  await expect(blocked).toHaveCount(0);
  await expect(generateButton(page)).toBeEnabled();
  // Kind round-trip keeps the reviewed composition.
  await card(page, "object").click();
  await expect(page.getByTestId("people-review-blocked")).toHaveCount(0);
  await card(page, "people").click();
  await expect(page.getByTestId("people-region-editor")).toHaveAttribute(
    "data-count",
    "3",
  );
  await fewestLines(page);
  await generateButton(page).click();
  const preview = page.locator(".result-card canvas[data-sequence-hash]");
  await expect(preview).toBeVisible({ timeout: 120000 });
  const hash = await preview.getAttribute("data-sequence-hash");
  await expect(page.getByTestId("result-subject")).toHaveAttribute(
    "data-subjects",
    "3",
  );
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await expect(page.getByTestId("player-hash")).toHaveText(hash!);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(hash!);
  const file = await exportProject(page);
  const i = file.project.instruction;
  await validateInstruction(i);
  expect(i.algorithm).toBe("group-optical/15");
  expect(i.params.portrait.people.faces.map((f: any) => f.id)).toEqual(ids);
  expect(i.params.subject.kind).toBe("people");
  expect(i.params.subject.subjects.map((s: any) => s.id)).toEqual(ids);
  expect(i.params.subject.subjects.every((s: any) => s.reviewed)).toBe(true);
  expect(file.project.progress.confirmed).toBe(0);
});

test("face model is fetched and verified once per analysis session", async ({
  page,
}) => {
  test.setTimeout(180000);
  let loads = 0;
  await page.route(
    "**/vendor/portrait-segmentation/face_landmarker.task",
    (r) => {
      loads++;
      return r.continue();
    },
  );
  await start(page);
  const status = page.getByTestId("background-status");
  await uploadFixture(page, "object", "first.png");
  await card(page, "people").click();
  await expect(status).not.toHaveAttribute("data-status", "processing", {
    timeout: 90000,
  });
  await uploadFixture(page, "car", "second.png");
  await expect(status).not.toHaveAttribute("data-status", "processing", {
    timeout: 90000,
  });
  expect(loads).toBe(1);
});

test("the generator Worker validates subject plans before any strategy", async ({
  page,
}) => {
  test.setTimeout(120000);
  const name = readdirSync("dist/assets").find((n) =>
    n.startsWith("generator.worker-"),
  )!;
  const n = 48,
    pixels = Array.from(syntheticSubject("car", n)),
    profile = createProfile("circle", 48),
    off = { ...structuredClone(DEFAULT_PORTRAIT), enabled: false },
    vehicle = makeSubjectPlan("vehicle", "rev", DEFAULT_EDITS, off),
    personMask = { ...vehicle, preparation: "explicit-person-mask" };
  await page.goto("/");
  const results = await page.evaluate(
    async ({ name, pixels, profile, cases, n }) => {
      const run = (job: string, extra: any) =>
        new Promise<any>((resolve) => {
          const w = new Worker("/assets/" + name, { type: "module" });
          w.onmessage = ({ data }) => {
            if (["done", "error"].includes(data.type)) {
              w.terminate();
              resolve({
                type: data.type,
                jobId: data.jobId,
                subject: data.instruction?.params.subject,
              });
            }
          };
          w.postMessage({
            jobId: job,
            strategy: "guarded",
            pixels: Uint8Array.from(pixels),
            profile,
            resolution: n,
            mode: "dark",
            lines: 30,
            stockPolicy: "estimate",
            ...extra,
          });
        });
      const out = [];
      for (const [job, extra] of cases) out.push(await run(job, extra));
      return out;
    },
    {
      name,
      pixels,
      profile,
      n,
      cases: [
        ["valid", { subject: vehicle }],
        [
          "anatomy-on-vehicle",
          {
            subject: vehicle,
            portrait: { ...DEFAULT_PORTRAIT, enabled: true },
          },
        ],
        ["person-mask-on-vehicle", { subject: personMask }],
      ] as [string, any][],
    },
  );
  expect(results[0]).toMatchObject({ type: "done", jobId: "valid" });
  expect(results[0].subject).toEqual(vehicle);
  expect(results[1]).toMatchObject({
    type: "error",
    jobId: "anatomy-on-vehicle",
  });
  expect(results[2]).toMatchObject({
    type: "error",
    jobId: "person-mask-on-vehicle",
  });
});
