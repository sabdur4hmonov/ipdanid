import { DEFAULT_CUSTOMER_LINES } from "../../src/customer-defaults";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { photoCases, gallery, english, png } from "./phase12-cases";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
import { referenceRaster } from "../../src/core/classic-reference";
import UPNGModule from "@pdf-lib/upng";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
test.use({ serviceWorkers: "block" });
for (const c of photoCases)
  test(`customer A/B ${c.name}`, async ({ page }) => {
    test.setTimeout(240000);
    test.skip(
      !existsSync(c.source),
      "Local photo acceptance fixtures deliberately excluded from Git.",
    );
    const out = `output/phase12/ab/${c.name}`;
    mkdirSync(out, { recursive: true });
    const results = [];
    await page.goto("/");
    await english(page);
    if (c.shape !== "circle")
      await page
        .getByRole("button", {
          name: c.shape === "heart" ? "Heart" : "Square",
          exact: true,
        })
        .click();
    await gallery(page, c);
    writeFileSync(
      out + "/target.png",
      Buffer.from(await png(page, "customer-photo"), "base64"),
    );
    const target = JSON.parse(
      (await page.getByTestId("customer-photo").getAttribute("data-framing"))!,
    );
    const start = Date.now();
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    let elapsed = Date.now() - start;
    if (Number(DEFAULT_CUSTOMER_LINES) !== 2500) {
      await page.locator(".customer-details summary").click();
      const began = Date.now();
      await page
        .locator(".budget-chips")
        .getByRole("button", { name: "2500", exact: true })
        .click();
      await expect(page.locator(".customer-effort")).toContainText("2500", {
        timeout: 60000,
      });
      elapsed = Date.now() - began;
    }

    for (const budget of [2500, 3000]) {
      if (budget === 3000) {
        if (
          (await page.locator(".customer-details").getAttribute("open")) ===
          null
        )
          await page.locator(".customer-details summary").click();
        const started = Date.now();
        await page
          .locator(".budget-chips")
          .getByRole("button", { name: "3000", exact: true })
          .click();
        await expect(page.locator(".customer-effort")).toContainText("3000", {
          timeout: 60000,
        });
        elapsed = Date.now() - started;
      }
      const image = await png(page, "customer-thread-result");
      writeFileSync(`${out}/app-${budget}.png`, Buffer.from(image, "base64"));
      await page
        .getByRole("button", { name: "Start assembling", exact: true })
        .click();
      if (budget === 2500) await unlockKitGuide(page);
      else {
        await page.getByTestId("unlock-build").click();
        await expect(page.getByTestId("build-gate")).toHaveCount(0);
      }
      await expect(page.getByTestId("player-hash")).toBeVisible();
      const dl = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Project JSON", exact: true })
        .last()
        .click();
      const project = JSON.parse(
          readFileSync((await (await dl).path())!, "utf8"),
        ).project,
        i = await validateInstruction(project.instruction);
      writeFileSync(`${out}/guide-${budget}.json`, JSON.stringify(i, null, 2));
      expect(i.metrics.lines).toBe(budget);
      expect(i.params.kitPreparation!.version).toBe("standard-preparation/4");
      expect(i.params.kitPreparation!.transform).toEqual(target);
      expect(i.algorithm).toBe("classic-greedy/2");
      expect(i.profile.pins).toHaveLength(240);
      const decoded = UPNG.decode(
          Uint8Array.from(Buffer.from(image, "base64")).buffer,
        ),
        actual = new Uint8Array(UPNG.toRGBA8(decoded)[0]),
        raster = referenceRaster(i, 1000);
      expect(
        Buffer.from(actual.filter((_, k) => k % 4 !== 3)).equals(
          Buffer.from(Uint8Array.from(raster, (v) => Math.round(v * 255))),
        ),
      ).toBe(true);
      results.push({
        budget,
        uiMs: elapsed,
        workerMs: i.metrics.durationMs,
        hash: i.sequenceHash,
        physicalRasterExact: true,
      });
      expect(elapsed).toBeLessThan(15000);
      await page
        .locator("aside")
        .getByRole("button", { name: "Create", exact: true })
        .click();
      await expect(page.getByTestId("customer-result")).toBeVisible();
    }
    writeFileSync(
      out + "/result.json",
      JSON.stringify(
        { name: c.name, source: c.source, shape: c.shape, results },
        null,
        2,
      ),
    );
  });
