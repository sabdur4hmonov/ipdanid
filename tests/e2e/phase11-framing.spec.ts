import { test, expect } from "./standard-expert-test";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
import {
  classicPins,
  referenceImportance,
} from "../../src/core/classic-reference";
import {
  classicGreedy,
  renderPreview,
} from "../../AGENT/reference/classic-string-art";
import UPNGModule from "@pdf-lib/upng";
const UPNG: typeof UPNGModule =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
test.use({ serviceWorkers: "block" });
const cases = [
  {
    name: "synthetic-1-circle",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "circle",
  },
  {
    name: "synthetic-2-circle",
    source: "output/phase10/inputs/synthetic-2.png",
    shape: "circle",
  },
  {
    name: "synthetic-3-circle",
    source: "output/phase10/inputs/synthetic-3.png",
    shape: "circle",
  },
  {
    name: "owner-phase9-circle",
    source: "output/portrait-dispatch/target-320.png",
    shape: "circle",
  },
  {
    name: "synthetic-1-square",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "rectangle",
  },
  {
    name: "synthetic-pair-heart",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "heart",
    pair: true,
  },
  {
    name: "synthetic-1-heart",
    source: "output/phase10/inputs/synthetic-1.png",
    shape: "heart",
    lines: 3000,
  },
] as const;
for (const c of cases)
  test(`ordinary JPG acceptance ${c.name}`, async ({ page, context }, info) => {
    test.setTimeout(240000);
    const budget = "lines" in c ? c.lines : 2500;
    test.skip(
      !existsSync(c.source) ||
        ("pair" in c && !existsSync("output/phase10/inputs/synthetic-2.png")),
      "Local synthetic/owner acceptance files are required; photos are deliberately excluded from Git.",
    );
    const out = `${newEvidenceRoot(process.env.IP_RASM_FRAMING_EVIDENCE || "output/current-framing")}/${info.project.name}/${c.name}`;
    mkdirSync(out, { recursive: true });
    const evidence: Record<string, unknown> = {
      name: c.name,
      project: info.project.name,
      source: c.source,
      shape: c.shape,
      ownerLocalOnly: c.name.startsWith("owner"),
      pair: "pair" in c,
    };
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto("/");
      const jpg = await page.evaluate(
        async ({ raw, other }) => {
          const load = async (b: string) => {
            const i = new Image();
            i.src = "data:image/png;base64," + b;
            await i.decode();
            return i;
          };
          const first = await load(raw),
            canvas = document.createElement("canvas");
          canvas.width = other ? 1600 : first.width;
          canvas.height = other ? 1100 : first.height;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#eee";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (other) {
            ctx.drawImage(first, 0, 100, 800, 800);
            ctx.drawImage(await load(other), 800, 100, 800, 800);
          } else ctx.drawImage(first, 0, 0);
          return canvas.toDataURL("image/jpeg", 0.96).split(",")[1];
        },
        {
          raw: readFileSync(c.source).toString("base64"),
          other:
            "pair" in c
              ? readFileSync("output/phase10/inputs/synthetic-2.png").toString(
                  "base64",
                )
              : "",
        },
      );
      const studio = page.getByTestId("standard-kit-studio"),
        chooser = page.waitForEvent("filechooser");
      await studio
        .getByRole("button", { name: "Galereyadan yuklash", exact: true })
        .click();
      await (
        await chooser
      ).setFiles({
        name: c.name + ".jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(jpg, "base64"),
      });
      await expect(studio.getByTestId("standard-photo-preview")).toBeVisible();
      await page.getByLabel("Language", { exact: true }).selectOption("en");
      await studio
        .locator("summary")
        .filter({ hasText: "Revision printed on your kit" })
        .click();
      await studio
        .getByLabel("Revision printed on your kit", { exact: true })
        .fill("1");
      await studio
        .getByRole("button", {
          name: "Use this printed kit revision",
          exact: true,
        })
        .click();
      await expect(studio).toContainText("r1");
      await studio
        .getByLabel("Kit shape", { exact: true })
        .selectOption(c.shape);
      await expect(studio.getByTestId("background-status")).toHaveAttribute(
        "data-status",
        "ready",
        { timeout: 90000 },
      );
      await expect(studio.getByTestId("standard-prepared-target")).toBeVisible({
        timeout: 20000,
      });
      if (c.name === "synthetic-1-circle") {
        const choice = studio.getByLabel("Connections", { exact: true });
        await choice.selectOption("3000");
        await expect(studio.getByTestId("line-budget-hours")).toContainText(
          "6.7",
        );
        await choice.selectOption("2000");
        await expect(studio.getByTestId("line-budget-hours")).toContainText(
          "4.4",
        );
        await choice.selectOption("2500");
        const shoulders = studio.getByRole("checkbox", {
          name: "Keep shoulders",
          exact: true,
        });
        const image = studio.getByTestId("standard-prepared-target");
        const original = await image.evaluate((c: HTMLCanvasElement) =>
          c.toDataURL(),
        );
        await shoulders.check();
        await expect
          .poll(() => image.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
          .not.toBe(original);
        await shoulders.uncheck();
        await expect
          .poll(() => image.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
          .toBe(original);
        const zoom = studio.getByLabel("Zoom 1", { exact: true });
        await zoom.fill("1.1");
        await expect
          .poll(() => image.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
          .not.toBe(original);
        await zoom.fill("1");
        await expect
          .poll(() => image.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
          .toBe(original);
      }
      if (budget !== 2500) {
        await studio
          .getByLabel("Connections", { exact: true })
          .selectOption(String(budget));
        await expect(
          studio.getByTestId("standard-prepared-target"),
        ).toBeVisible();
      }
      evidence.detectedFaceCount = await studio
        .getByLabel(/^Face \d+ left$/)
        .count();
      if ("pair" in c) expect(evidence.detectedFaceCount).toBe(2);
      const target = await studio
        .getByTestId("standard-prepared-target")
        .evaluate((canvas: HTMLCanvasElement) => ({
          png: canvas.toDataURL("image/png").split(",")[1],
          pixels: Array.from(
            canvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height)
              .data.filter((_, k) => k % 4 !== 3),
          ),
        }));
      writeFileSync(out + "/target.png", Buffer.from(target.png, "base64"));
      await studio
        .getByRole("checkbox", {
          name: "I checked every face, the white background and crop",
          exact: true,
        })
        .check();
      const started = Date.now();
      await studio
        .getByRole("button", { name: "Calculate standard guide", exact: true })
        .click();
      await expect(
        studio.getByRole("button", { name: "Save and assemble", exact: true }),
      ).toBeVisible({ timeout: 60000 });
      evidence.uiGenerationMs = Date.now() - started;
      const png = await studio
        .getByTestId("standard-thread-result")
        .evaluate(
          (canvas: HTMLCanvasElement) =>
            canvas.toDataURL("image/png").split(",")[1],
        );
      writeFileSync(out + "/app.png", Buffer.from(png, "base64"));
      await page.screenshot({ path: out + "/screen.png", fullPage: true });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await studio
        .getByRole("button", { name: "Save and assemble", exact: true })
        .click();
      await unlockKitGuide(page);
      await expect(page.getByTestId("player-hash")).toBeVisible();
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Project JSON", exact: true })
        .last()
        .click();
      const project = JSON.parse(
          readFileSync((await (await download).path())!, "utf8"),
        ).project,
        i = await validateInstruction(project.instruction);
      writeFileSync(out + "/guide.json", JSON.stringify(i, null, 2));
      expect(i.algorithm).toBe("classic-greedy/2");
      expect(i.params.resolution).toBe(500);
      expect(i.metrics.lines).toBe(budget);
      expect(i.profile.pins.length).toBe(240);
      expect(i.profile.threadMm).toBe(0.12);
      expect(i.profile.opacity).toBe(0.9);
      expect(i.profile.pins[76].sectorLabel).toBe("B-17");
      expect(i.profile.standardKit!.config.revision).toBe(1);
      expect(i.params.kitPreparation!.version).toBe("standard-preparation/3");
      const after = i.params.kitPreparation!.transform.targetFaces!;
      evidence.framing = i.params.kitPreparation!.transform;
      evidence.newFaceHeights = after.map((f) => f.height);
      const lastChin = Math.max(
        ...i.params.kitPreparation!.transform.framing!.heads.map((h) => h.chin),
      );
      expect(
        target.pixels
          .slice(Math.ceil((lastChin + 18 / 500) * 500) * 500 * 3)
          .every((v) => v === 255),
      ).toBe(true);
      evidence.targetWhiteBelowChinFade = true;
      const oldPath = `output/phase10/mobile-browser/${c.name}/guide.json`;
      if (existsSync(oldPath)) {
        const frozen = JSON.parse(readFileSync(oldPath, "utf8"));
        expect(frozen.params.kitPreparation.version).toBe(
          "standard-preparation/2",
        );
        const original = JSON.parse(
          readFileSync("output/phase10/results.json", "utf8"),
        ).rows.find(
          (r: any) => r.project === "mobile-browser" && r.name === c.name,
        );
        expect(frozen.sequenceHash).toBe(original.sequenceHash);
        const before = frozen.params.kitPreparation.transform.targetFaces;
        evidence.oldFaceHeights = before.map(
          (f: { height: number }) => f.height,
        );
        after.forEach((f, j) =>
          expect(f.height / before[j].height).toBeGreaterThan(1.3),
        );
      } else {
        expect(c.name).toBe("synthetic-1-heart");
        expect(
          i.params.kitPreparation!.transform.framing!.heads[0].target.height,
        ).toBeCloseTo(0.65);
      }
      evidence.sequenceHash = i.sequenceHash;
      if (existsSync("output/phase11/framing-baseline.json")) {
        const baseline = JSON.parse(
          readFileSync("output/phase11/framing-baseline.json", "utf8"),
        ).find(
          (r: { project: string; name: string }) =>
            r.project === info.project.name && r.name === c.name,
        );
        if (baseline) {
          expect(
            createHash("sha256")
              .update(Buffer.from(target.png, "base64"))
              .digest("hex"),
          ).toBe(baseline.target);
          expect(
            createHash("sha256")
              .update(Buffer.from(png, "base64"))
              .digest("hex"),
          ).toBe(baseline.app);
          expect(i.sequenceHash).toBe(baseline.sequence);
          evidence.exactBeforeAfterPreparationCache = true;
        }
      }
      evidence.workerMs = i.metrics.durationMs;
      evidence.metres = i.metrics.estimatedMeters;
      evidence.connections = i.metrics.lines;
      const pixels = Uint8Array.from(target.pixels),
        gray = Float32Array.from(
          { length: 500 * 500 },
          (_, k) => pixels[k * 3] / 255,
        ),
        pins = classicPins(i.profile, 500);
      if (c.shape !== "heart") {
        const reference = classicGreedy(gray, {
          size: 500,
          pins,
          lines: budget,
          minGap: 25,
          lineDarkness: 0.15,
          maxChordRepeat: 1,
          darknessGamma: 1.6,
          overdrawPenalty: 3,
          importance: referenceImportance(500, i.params.classic!.faces),
        });
        expect(i.segments[0].path).toEqual(reference.sequence);
        evidence.referencePathExact = true;
      } else
        evidence.referencePathExact =
          "Heart adds mandatory concave-chord guards to the circle reference.";
      const physical = renderPreview(
          i.segments[0].path,
          pins,
          500,
          1000,
          i.profile.standardKit!.config.baseMm *
            i.profile.standardKit!.patternScale,
          0.12,
          0.9,
        ),
        rgba = new Uint8Array(1000 * 1000 * 4);
      for (let k = 0; k < physical.length; k++) {
        rgba[k * 4] =
          rgba[k * 4 + 1] =
          rgba[k * 4 + 2] =
            Math.round(physical[k] * 255);
        rgba[k * 4 + 3] = 255;
      }
      writeFileSync(
        out + "/reference-same-path.png",
        new Uint8Array(UPNG.encode([rgba.buffer], 1000, 1000, 0)),
      );
      const decoded = UPNG.decode(
          Uint8Array.from(Buffer.from(png, "base64")).buffer,
        ),
        app = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
      expect(Buffer.from(app).equals(Buffer.from(rgba))).toBe(true);
      evidence.physicalRasterExact = true;
      const txtDownload = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "TXT sequence", exact: true })
        .last()
        .click();
      const txt = readFileSync((await (await txtDownload).path())!, "utf8");
      writeFileSync(out + "/guide.txt", txt);
      expect(JSON.parse(txt.split("\n")[1])).toEqual(i);
      expect(txt).toContain(i.profile.pins[i.segments[0].path[0]].sectorLabel);
      const pdfDownload = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "PDF guide", exact: true })
        .last()
        .click();
      copyFileSync((await (await pdfDownload).path())!, out + "/guide.pdf");
      await context.setOffline(true);
      await expect(page.getByTestId("player-hash")).toBeVisible();
      expect(evidence.uiGenerationMs).toBeLessThan(15000);
      expect(errors).toEqual([]);
      evidence.passed = true;
    } finally {
      evidence.errors = errors;
      writeFileSync(out + "/result.json", JSON.stringify(evidence, null, 2));
    }
  });
