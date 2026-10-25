import { newEvidenceRoot } from "../helpers/evidence-paths";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { gallery, photoCases, english, png } from "./phase12-cases";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
import { flatten } from "../../src/core/engine";
import {
  pinLabel,
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../../src/core/standard-kit";
test.use({ trace: "off" });
for (const [shape, label] of [
  ["circle", "Circle"],
  ["rectangle", "Square"],
  ["heart", "Heart"],
] as const)
  test(`real photo to printed-kit first step and offline rest: ${shape}`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(240000);
    const out = newEvidenceRoot(`output/board-first-build/${info.project.name}/${shape}`);
    mkdirSync(out, { recursive: true });
    await page.goto("/");
    await english(page);
    await gallery(page, photoCases[0]);
    await page.getByRole("button", { name: label, exact: true }).click();
    const start = Date.now();
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    const generationMs = Date.now() - start;
    expect(generationMs).toBeLessThan(15000);
    const guide = await validateInstruction(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0]
            .instruction,
      ),
    );
    expect(guide.algorithm).toBe("classic-greedy/3");
    expect(guide.metrics.lines).toBe(3000);
    const printed = standardProfiles(
      structuredClone(DEFAULT_STANDARD_KIT),
    ).find((p) => p.shape === shape)!;
    expect(guide.profile.widthMm).toBe(500);
    expect(guide.profile.heightMm).toBe(500);
    // V8/Chrome trigonometric ULPs may differ; tolerance is <0.000000001 mm.
    let pinCoordinateMaxErrorMm = 0;
    for (let j = 0; j < printed.pins.length; j++) {
      const a = guide.profile.pins[j], b = printed.pins[j];
      expect(a.id).toBe(b.id);
      expect(a.sectorLabel).toBe(b.sectorLabel);
      const errorMm = Math.hypot(a.x-b.x,a.y-b.y)*500;
      pinCoordinateMaxErrorMm = Math.max(pinCoordinateMaxErrorMm,errorMm);
      expect(errorMm).toBeLessThan(1e-9);
    }
    await page.screenshot({ path: out + "/result.png", fullPage: true });
    writeFileSync(
      out + "/app.png",
      Buffer.from(await png(page, "customer-thread-result"), "base64"),
    );
    // Use a normal current physical-kit code, not an imported/unlocked seed.
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    await unlockKitGuide(
      page,
      `standard-base-r${printed.standardKit!.config.revision}`,
    );
    await (await downloading).saveAs(out + "/guide.pdf");
    await page
      .getByRole("button", { name: "Start assembling", exact: true })
      .click();
    const edges = flatten(guide),
      route = (step: number) =>
        pinLabel(guide.profile, edges[step - 1].from) +
        " → " +
        pinLabel(guide.profile, edges[step - 1].to);
    await expect(page.getByTestId("player-hash")).toHaveText(
      guide.sequenceHash,
    );
    await expect(page.getByTestId("assembly-current-route")).toHaveText(
      route(1),
    );
    await expect(page.getByTestId("confirmed-step")).toHaveText("0/3000");
    await page.screenshot({ path: out + "/first-step.png", fullPage: true });
    for (let j = 1; j <= 3; j++) {
      await page.getByTestId("assembly-confirm").click();
      await expect(page.getByTestId("confirmed-step")).toHaveText(`${j}/3000`);
      await expect(page.getByTestId("assembly-current-route")).toHaveText(
        route(j + 1),
      );
    }
    await expect(page.getByTestId("assembly-save-state")).toHaveAttribute(
      "data-state",
      "saved",
    );
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await page.getByTestId("assembly-rest").click();
    await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute(
      "data-state",
      "saved",
    );
    await page.screenshot({ path: out + "/rest-saved.png", fullPage: true });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("assembly-current-route")).toHaveText(
      route(4),
    );
    await expect(page.getByTestId("confirmed-step")).toHaveText("3/3000");
    await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute(
      "data-state",
      "saved",
    );
    await page.getByTestId("assembly-rest").click();
    await page.getByTestId("assembly-confirm").click();
    await expect(page.getByTestId("confirmed-step")).toHaveText("4/3000");
    await expect(page.getByTestId("assembly-current-route")).toHaveText(
      route(5),
    );
    await expect(page.getByTestId("player-hash")).toHaveText(
      guide.sequenceHash,
    );
    await page.screenshot({
      path: out + "/offline-resumed.png",
      fullPage: true,
    });
    writeFileSync(out + "/guide.json", JSON.stringify(guide));
    writeFileSync(
      out + "/checks.json",
      JSON.stringify(
        {
          shape,
          generationMs,
          sequenceHash: guide.sequenceHash,
          pinCoordinatesEqualPrintedTemplate: true,
          pinCoordinateMaxErrorMm,
          firstRoute: route(1),
          resumedRoute: route(4),
          confirmedAfterResume: 4,
        },
        null,
        2,
      ),
    );
    await context.setOffline(false);
  });
