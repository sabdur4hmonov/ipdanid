import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { gallery, photoCases } from "./phase12-cases";
import { customerFlowText } from "../../src/customer-flow-i18n";
import { uiText } from "../../src/ui-i18n";
import { trialText } from "../../src/trial-i18n";
import type { Locale } from "../../src/core/types";
test.use({ trace: "off" });
const locales = ["uz", "uz-Cyrl", "ru", "en"] as const;
async function language(page: Page, locale: Locale) {
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
  await page.getByTestId("locale-picker").selectOption(locale);
  await expect(page.getByTestId("locale-picker")).toHaveAttribute(
    "aria-label",
    uiText(locale, "language"),
  );
  await menu.locator("summary").click();
}
test("four real customer languages cover start, prepared photo, immutable result and code gate", async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const out = newEvidenceRoot("output/current-locales/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const l of locales) {
    await language(page, l);
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "gallery"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "camera"),
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: `${out}/start-${l}.png`, fullPage: true });
  }
  await gallery(page, photoCases[0]);
  const framing = await page
    .getByTestId("customer-photo")
    .getAttribute("data-framing");
  for (const l of locales) {
    await language(page, l);
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "generate"),
        exact: true,
      }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "rotate") + " ↻",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByTestId("customer-photo")).toHaveAttribute(
      "data-framing",
      framing!,
    );
    await page.screenshot({ path: `${out}/adjust-${l}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  const raster = () =>
    page
      .getByTestId("customer-thread-result")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const same = await raster();
  for (const l of locales) {
    await language(page, l);
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "pdf"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "readjust"),
        exact: true,
      }),
    ).toBeVisible();
    expect(await raster()).toBe(same);
    await page.screenshot({ path: `${out}/result-${l}.png`, fullPage: true });
  }
  // Code gate's lazy controls use the selected language too.
  for (const l of locales) {
    await language(page, l);
    await page
      .getByRole("button", { name: customerFlowText(l, "start"), exact: true })
      .click();
    await expect(page.getByTestId("build-gate")).toBeVisible();
    await expect(page.getByTestId("trial-claim").locator("summary")).toHaveText(
      trialText(l, "title"),
    );
    await page.screenshot({ path: `${out}/gate-${l}.png`, fullPage: true });
    await page
      .getByRole("button", { name: customerFlowText(l, "close"), exact: true })
      .click();
  }
  expect(errors).toEqual([]);
});
test("failed photo uses translated recovery and a localized accessible language picker", async ({
  page,
}) => {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", {
      name: customerFlowText("uz", "gallery"),
      exact: true,
    })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "synthetic-broken.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  for (const l of locales) {
    await language(page, l);
    await expect(page.getByRole("alert")).toContainText(
      customerFlowText(l, "error"),
    );
    await expect(
      page.getByRole("button", {
        name: customerFlowText(l, "generate"),
        exact: true,
      }),
    ).toBeDisabled();
  }
});
