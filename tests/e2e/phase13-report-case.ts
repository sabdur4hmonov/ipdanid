import { expect, type Page, type TestInfo } from "@playwright/test";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import { gallery, english, png, photoCases } from "./phase12-cases";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
import {
  generateClassicReference,
  referenceProfile,
  referenceRaster,
} from "../../src/core/classic-reference";
import { isSquareCentreAxis } from "../../src/core/classic-least-squares";
import { standardProfiles } from "../../src/core/standard-kit";
import { viewingSsim } from "../helpers/viewing-ssim";
import { inside } from "../../src/core/geometry";
import { hash } from "../../src/core/engine";
import type { Instruction } from "../../src/core/types";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
export const phase13Cases = [
  ...photoCases,
  {
    name: "owner-phase9-square",
    source: "output/portrait-dispatch/target-320.png",
    shape: "rectangle" as const,
  },
];
const decode = (raw: Buffer) => {
  const d = UPNG.decode(Uint8Array.from(raw).buffer);
  return { width: d.width, rgba: new Uint8Array(UPNG.toRGBA8(d)[0]) };
};
function encode(i: Instruction) {
  const r = referenceRaster(i, 1000),
    rgba = new Uint8Array(1000 * 1000 * 4);
  for (let k = 0; k < 1000 * 1000; k++) {
    for (let c = 0; c < 3; c++)
      rgba[k * 4 + c] = Math.round(r[k * 3 + c] * 255);
    rgba[k * 4 + 3] = 255;
  }
  return Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0));
}
export async function reportCase(
  page: Page,
  info: TestInfo,
  c: (typeof phase13Cases)[number],
) {
  const out = `${newEvidenceRoot(process.env.IP_RASM_SHARPER_EVIDENCE || "output/current-sharper")}/${info.project.name}/${c.name}`;
  mkdirSync(out, { recursive: true });
  await page.goto("/");
  await english(page);
  if (c.shape !== "circle")
    await page
      .getByRole("button", {
        name: c.shape === "heart" ? "Heart" : "Square",
        exact: true,
      })
      .click();
  await gallery(page, c as Parameters<typeof gallery>[1]);
  const targetImage = Buffer.from(await png(page, "customer-photo"), "base64");
  writeFileSync(out + "/target.png", targetImage);
  const proof = JSON.parse(
      (await page.getByTestId("customer-photo").getAttribute("data-framing"))!,
    ),
    decoded = decode(targetImage),
    pixels = Uint8Array.from(decoded.rgba.filter((_, k) => k % 4 !== 3)),
    gray = Float32Array.from(
      { length: 500 * 500 },
      (_, k) => pixels[k * 3] / 255,
    ),
    mask = Uint8Array.from({ length: 160 * 160 }, (_, k) =>
      inside(c.shape, (k % 160) / 159, Math.floor(k / 160) / 159) ? 1 : 0,
    ),
    measure = (i: Instruction) => {
      const rgb = referenceRaster(i, 1000);
      return viewingSsim(
        gray,
        500,
        Float32Array.from({ length: 1000 * 1000 }, (_, k) => rgb[k * 3]),
        1000,
        { faces: proof.targetFaces, boardMask: mask },
      );
    },
    axes = (i: Instruction) =>
      i.segments[0].path
        .slice(1)
        .flatMap((to, k) =>
          isSquareCentreAxis(i.profile, i.segments[0].path[k], to)
            ? [{ step: k + 1, from: i.segments[0].path[k], to }]
            : [],
        );
  expect(decoded.width).toBe(500);
  const results = [];
  let baseline: Instruction | undefined,
    oldScore: ReturnType<typeof measure> | undefined;
  for (const budget of [3000, 2500, 3500]) {
    let started = Date.now();
    if (budget === 3000)
      await page.getByRole("button", { name: "Create", exact: true }).click();
    else {
      if (
        (await page.locator(".customer-details").getAttribute("open")) === null
      )
        await page.locator(".customer-details summary").click();
      const chips = page.locator(".budget-chips");
      await expect(chips.getByRole("button")).toHaveCount(3);
      for (const v of [2500, 3000, 3500])
        await expect(
          chips.getByRole("button", { name: new RegExp(`^${v} · ~`) }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      started = Date.now();
      await chips
        .getByRole("button", { name: new RegExp(`^${budget} · ~`) })
        .click();
    }
    await expect(page.locator(".customer-effort")).toContainText(
      String(budget),
      { timeout: 60000 },
    );
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(15000);
    const image = Buffer.from(
      await png(page, "customer-thread-result"),
      "base64",
    );
    writeFileSync(`${out}/app-v3-${budget}.png`, image);
    if (budget === 3000) {
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download PDF", exact: true })
        .click();
      await unlockKitGuide(page);
      copyFileSync((await (await download).path())!, out + "/guide.pdf");
      await page.screenshot({ path: out + "/result.png", fullPage: true });
    }
    await page
      .getByRole("button", { name: "Start assembling", exact: true })
      .click();
    if (budget !== 3000) {
      await page.getByTestId("unlock-build").click();
      await expect(page.getByTestId("build-gate")).toHaveCount(0);
    }
    await expect(page.getByTestId("player-hash")).toBeVisible();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .last()
      .click();
    const i = await validateInstruction(
      JSON.parse(readFileSync((await (await download).path())!, "utf8")).project
        .instruction,
    );
    writeFileSync(`${out}/guide-v3-${budget}.json`, JSON.stringify(i, null, 2));
    expect(i.algorithm).toBe("classic-greedy/3");
    expect(i.metrics.lines).toBe(budget);
    expect(i.profile.pins).toHaveLength(240);
    expect(i.params.kitPreparation!.transform).toEqual(proof);
    expect(i.imageHash).toBe(await hash(pixels));
    expect(
      Buffer.from(decode(image).rgba.filter((_, k) => k % 4 !== 3)).equals(
        Buffer.from(
          Uint8Array.from(referenceRaster(i, 1000), (v) => Math.round(v * 255)),
        ),
      ),
    ).toBe(true);
    expect(axes(i)).toEqual([]);
    if (!baseline) {
      const controlProfile = referenceProfile(
        standardProfiles(i.profile.standardKit!.config).find(
          (p) => p.shape === c.shape,
        )!,
      );
      // Use the actual saved browser doubles, not Node's few-ULP trig rebuild.
      // This makes both physical paths use exactly the same pins and labels.
      controlProfile.pins = structuredClone(i.profile.pins);
      baseline = await generateClassicReference({
        pixels,
        resolution: 500,
        lines: 3000,
        mode: "dark",
        profile: controlProfile,
        kitPreparation: i.params.kitPreparation,
        accessPolicy: "kit-build/1",
      });
      await validateInstruction(baseline);
      oldScore = measure(baseline);
      writeFileSync(
        out + "/guide-v2-3000.json",
        JSON.stringify(baseline, null, 2),
      );
      writeFileSync(out + "/app-v2-3000.png", encode(baseline));
      expect(baseline.profile.pins).toEqual(i.profile.pins);
    }
    const score = measure(i);
    if (budget === 3000) {
      expect(score.face.ssim).toBeGreaterThanOrEqual(oldScore!.face.ssim);
      for (let j = 0; j < score.faces.length; j++)
        expect(score.faces[j].ssim).toBeGreaterThanOrEqual(
          oldScore!.faces[j].ssim,
        );
    }
    results.push({
      budget,
      uiMs: elapsed,
      workerMs: i.metrics.durationMs,
      hash: i.sequenceHash,
      physicalRasterExact: true,
      score,
      axisCentreChords: axes(i),
    });
    writeFileSync(
      out + "/result.json",
      JSON.stringify(
        {
          name: c.name,
          shape: c.shape,
          source: c.source,
          targetHash: i.imageHash,
          defaultLines: 3000,
          metric:
            "viewing-ssim/1; actual reviewed face ovals; no tone normalization",
          baseline: {
            budget: 3000,
            score: oldScore,
            axisCentreChords: axes(baseline),
          },
          results,
        },
        null,
        2,
      ),
    );
    await page
      .locator("aside")
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(page.getByTestId("customer-result")).toBeVisible();
  }
}
