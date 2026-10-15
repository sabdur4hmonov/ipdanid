import { test, expect } from "./legacy-test";
import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { rasterSequence } from "../../src/core/optical";
import { generateDensity } from "../../src/core/density";
import { DEFAULT_SUBJECT_OBJECTIVE } from "../../src/core/subject-objective";
import { defaultPhysicalContrast } from "../../src/core/physical-contrast";
import { progressFor } from "../../src/core/validation";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { createProfile } from "../../src/core/geometry";
import { makeSubjectPlan } from "../../src/core/subject-plan";
import { DEFAULT_EDITS } from "../../src/core/types";
import { syntheticSubject } from "../fixtures/synthetic-subjects";
import UPNGModule from "@pdf-lib/upng";
import { revealControl } from "./navigation";

test("generic manual marks are crop-bound, locally reviewed and dispatched to real subject Worker", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    const Original = window.Worker;
    (window as any).__subjectJobs = [];
    window.Worker = class extends Original {
      postMessage(m: any, ...args: any[]) {
        if (m?.pixels && m.profile)
          (window as any).__subjectJobs.push({
            strategy: m.strategy,
            subject: m.subject,
            resolution: m.resolution,
          });
        super.postMessage(m, ...(args as [any]));
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  const rgb = syntheticSubject("dog", 160),
    rgba = new Uint8Array(160 * 160 * 4),
    UPNG: any = (UPNGModule as any).default ?? UPNGModule;
  for (let k = 0; k < 160 * 160; k++) {
    rgba.set(rgb.slice(k * 3, k * 3 + 3), k * 4);
    rgba[k * 4 + 3] = 255;
  }
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "dog.png",
      mimeType: "image/png",
      buffer: Buffer.from(UPNG.encode([rgba.buffer], 160, 160, 0)),
    });
  await expect(page.getByTestId("subject-kind")).toBeVisible();
  await page
    .getByTestId("subject-kind")
    .locator('[data-kind="animal"]')
    .click();
  await page.getByTestId("subject-fit-options").locator("summary").click();
  await page.getByTestId("subject-fit-enable").check();
  await revealControl(page.getByTestId("subject-marks"));
  await expect(
    page.getByRole("checkbox", { name: "Prioritize portrait", exact: true }),
  ).toHaveCount(0);
  await page.getByTestId("subject-mark-reviewed").check();
  await page.getByRole("button", { name: "Add detail", exact: true }).click();
  await expect(page.getByTestId("subject-mark-reviewed")).not.toBeChecked();
  await page.getByTestId("subject-detail-role").selectOption("nose");
  await page.getByTestId("subject-mark-reviewed").check();
  await page.getByTestId("subject-mark-box").scrollIntoViewIfNeeded();
  const rect = (await page.getByTestId("subject-mark-box").boundingBox())!;
  await page.mouse.move(rect.x + 4, rect.y + 4);
  await page.mouse.down();
  await page.mouse.move(rect.x + 14, rect.y + 4);
  await page.mouse.up();
  await expect(page.getByTestId("subject-mark-reviewed")).not.toBeChecked();
  await page.getByTestId("subject-mark-reviewed").check();
  // Grid change invalidates review, returning to the previous recipe restores its own marks.
  await page
    .getByLabel("Computation resolution", { exact: true })
    .selectOption("192");
  await expect(page.getByTestId("subject-mark-reviewed")).not.toBeChecked();
  await page
    .getByLabel("Computation resolution", { exact: true })
    .selectOption("160");
  await expect(page.getByTestId("subject-mark-reviewed")).toBeChecked();
  const pins = page.getByLabel("Number of pins", { exact: true });
  await revealControl(pins);
  await pins.fill("24");
  const lines = page.getByLabel("Maximum lines", { exact: true });
  await revealControl(lines);
  await lines.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.getByTestId("generate").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__subjectJobs.length))
    .toBeGreaterThan(0);
  const job = await page.evaluate(() => (window as any).__subjectJobs.at(-1));
  expect(job.strategy).toBe("subjects");
  expect(job.subject.kind).toBe("animal");
  expect(job.subject.subjects[0].regions[0].role).toBe("nose");
  expect(job.subject.subjects[0].reviewed).toBe(true);
  await expect(page.getByTestId("variant-audit").first()).toBeVisible({
    timeout: 120000,
  });
  await page.screenshot({
    path: test.info().outputPath("manual-subject.png"),
    fullPage: true,
  });
});

test("real generalized Worker emits bound state and refuses unreviewed and colour cases without fallback", async ({
  page,
}) => {
  test.setTimeout(180000);
  const name = readdirSync((process.env.IP_RASM_TEST_WEB_DIR || "dist") + "/assets").find((n) =>
      n.startsWith("generator.worker-"),
    )!,
    profile = createProfile("circle", 24),
    subject = makeSubjectPlan("object", "synthetic-worker", DEFAULT_EDITS);
  subject.subjects[0].reviewed = true;
  await page.goto("/");
  const known = {
      profile,
      params: { resolution: 320 },
      segments: [{ color: profile.colors[0], path: [0, 6, 12, 18, 0] }],
      metrics: { lines: 4 },
    } as any,
    pixels = Array.from(
      Uint8Array.from(rasterSequence(known), (v) => Math.round(v * 255)),
    );
  const result = await page.evaluate(
    async ({ name, profile, subject, pixels }) => {
      const run = (variant: string, seed?: any) =>
        new Promise<any>((resolve, reject) => {
          const worker = new Worker("/assets/" + name, { type: "module" }),
            events: any[] = [];
          const timer = setTimeout(() => {
            worker.terminate();
            reject(Error("Generalized worker timeout"));
          }, 120000);
          worker.onmessage = ({ data }) => {
            events.push(data);
            if (["done", "error"].includes(data.type)) {
              clearTimeout(timer);
              worker.terminate();
              resolve({ data, events });
            }
          };
          worker.onerror = (e) => {
            clearTimeout(timer);
            worker.terminate();
            reject(Error(e.message));
          };
          const plan = structuredClone(subject);
          if (variant === "review") plan.subjects[0].reviewed = false;
          worker.postMessage({
            jobId: variant,
            strategy: "subjects",
            profile,
            subject: plan,
            resolution: 320,
            pixels: Uint8Array.from(pixels),
            lines: 800,
            mode: variant === "colour" ? "color" : "dark",
            totalSweeps: 1,
            seed,
          });
        });
      const valid = await run("valid");
      return [
        valid,
        await run("review"),
        await run("colour"),
        await run("continue", valid.data.instruction),
      ];
    },
    { name, profile, subject, pixels },
  );
  expect(result[0].data.type).toBe("done");
  expect(result[0].data.instruction.algorithm).toBe("density-subject/18");
  expect(result[0].data.instruction.params.resolution).toBe(320);
  expect(result[0].events.some((e: any) => e.type === "fit-checkpoint")).toBe(
    true,
  );
  expect(result[1].data.type).toBe("error");
  expect(result[1].data.message).toBe("subject-fit/review");
  expect(result[2].data.type).toBe("error");
  expect(result[2].data.message).toBe("subject-fit/combination");
  expect(result[3].data.type).toBe("done");
  expect(result[3].data.subjectScreen.subjects).toHaveLength(1);
  expect(result[3].data.subjectScreen.reference).toBe(
    result[0].data.instruction.sequenceHash,
  );
  for (const [k, job] of ["valid", "review", "colour", "continue"].entries())
    expect(result[k].events.every((e: any) => e.jobId === job)).toBe(true);
});

test("generic guide has exact zero-progress offline JSON TXT and optical PDF", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const subject = makeSubjectPlan("animal", "synthetic-export", DEFAULT_EDITS);
  subject.subjects[0].reviewed = true;
  const i = await generateDensity(
    {
      subject,
      profile: createProfile("rectangle", 24),
      pixels: syntheticSubject("dog", 32),
      resolution: 32,
      lines: 800,
      mode: "dark",
    },
    {
      subjectObjective: DEFAULT_SUBJECT_OBJECTIVE,
      physical: defaultPhysicalContrast(),
      edgeWeight: 2,
      sweeps: 1,
    },
  );
  const fixture = info.outputPath("subject.json");
  writeFileSync(
    fixture,
    JSON.stringify({
      schema: "iprasm.project/1",
      project: {
        id: crypto.randomUUID(),
        name: "Synthetic animal",
        edits: DEFAULT_EDITS,
        instruction: i,
        progress: progressFor(i),
      },
    }),
  );
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.locator('input[accept=".json,.txt"]').setInputFiles(fixture);
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toContainText(
    `0/${i.metrics.lines}`,
  );
  for (const button of ["Project JSON", "TXT sequence", "PDF guide"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: button, exact: true })
      .last()
      .click();
    const download = await pending,
      path = (await download.path())!;
    if (button === "Project JSON")
      expect(
        JSON.parse(readFileSync(path, "utf8")).project.instruction,
      ).toEqual(i);
    if (button === "TXT sequence")
      expect(JSON.parse(readFileSync(path, "utf8").split("\n")[1])).toEqual(i);
    if (button === "PDF guide") {
      const pdf = await PDFDocument.load(readFileSync(path)),
        images = pdf
          .getPage(0)
          .node.Resources()!
          .lookup(PDFName.of("XObject")) as any,
        previews = images
          .entries()
          .map((entry: any) => pdf.context.lookup(entry[1]))
          .filter(
            (s: any) =>
              s instanceof PDFRawStream &&
              s.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
          );
      expect(previews).toHaveLength(1);
      expect(Buffer.from(decodePDFRawStream(previews[0]).decode())).toEqual(
        Buffer.from(
          Uint8Array.from(rasterSequence(i), (v) => Math.round(v * 255)),
        ),
      );
    }
    await download.saveAs(info.outputPath(button.replaceAll(" ", "-")));
  }
});
