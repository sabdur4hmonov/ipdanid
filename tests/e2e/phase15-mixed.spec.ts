import { newEvidenceRoot } from "../helpers/evidence-paths";
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { english, png } from "./phase12-cases";
import { validateInstruction } from "../../src/core/validation";
for (const [index, text] of [
  "Ali سلام Мир 2026",
  "سلام Ali Мир ٢٠٢٦",
].entries())
  test(`mixed text ${index} creates a real normal-flow target and physical sequence`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.goto("/");
    await english(page);
    const menu = page.getByTestId("customer-menu");
    await menu.locator("summary").click();
    await page.getByTestId("product-kind").selectOption("lettering");
    await menu.locator("summary").click();
    await page.getByTestId("lettering-input").fill(text);
    await page.getByTestId("prepare-lettering").click();
    await expect(page.getByTestId("customer-adjust")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByRole("button", { name: "Create", exact: true }),
    ).toBeEnabled();
    const target = await png(page, "customer-photo");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    const i = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction,
    );
    await validateInstruction(i);
    expect(i.metrics.lines).toBe(3000);
    expect(i.params.kitPreparation.transform.product.kind).toBe("lettering");
    const dir = newEvidenceRoot(`output/current-bidi/${info.project.name}/normal-${index}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(dir + "/target.png", Buffer.from(target, "base64"));
    writeFileSync(
      dir + "/result.png",
      Buffer.from(await png(page, "customer-thread-result"), "base64"),
    );
    writeFileSync(dir + "/guide.json", JSON.stringify(i));
    await page.screenshot({ path: dir + "/screen.png", fullPage: true });
  });
