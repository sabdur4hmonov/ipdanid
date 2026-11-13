import { test, expect, type Page } from "@playwright/test";
import { studioHomeText } from "../../src/studio-home-i18n";
import { customerFlowText } from "../../src/customer-flow-i18n";
import { english, choosePhoto, result } from "../protected-e2e/helpers";
test.use({ trace: "off" });

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("product-led home is localized, responsive, keyboard-accessible and has an offline concept asset", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await english(page);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    await page.getByTestId("customer-menu").locator("summary").click();
    await page.getByTestId("locale-picker").selectOption(locale);
    await page.getByTestId("customer-menu").locator("summary").click();
    await expect(page.locator("#studio-title")).toContainText(
      studioHomeText(locale, "titleOne"),
    );
    await expect(page.locator(".studio-hero-art figcaption")).toHaveText(
      studioHomeText(locale, "artNote"),
    );
    await expect(
      page.getByRole("button", {
        name: customerFlowText(locale, "gallery"),
        exact: true,
      }),
    ).toBeVisible();
    for (const width of [360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
      const account = await page
        .getByTestId("customer-account-link")
        .boundingBox();
      expect(account!.x).toBeGreaterThanOrEqual(0);
      expect(account!.x + account!.width).toBeLessThanOrEqual(width);
    }
  }
  await page.locator("#studio-faq summary").first().focus();
  await page.locator("#studio-faq summary").first().press("Enter");
  await expect(page.locator("#studio-faq details").first()).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("#studio-faq details").first()).toContainText(
    "No photo is guaranteed a perfect likeness.",
  );
  if (info.project.name === "mobile-browser")
    await page.getByTestId("home-shape-heart").tap();
  else await page.getByTestId("home-shape-heart").click();
  await expect(page.getByTestId("home-shape-heart")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .locator(".studio-closing")
    .getByRole("button", {
      name: studioHomeText("en", "backUpload"),
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Choose photo", exact: true }),
  ).toBeFocused();
  for (const width of [360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`home-${width}.png`),
      fullPage: true,
    });
  }
  const art = page.locator(".studio-hero-art > img");
  const assetHash = async () =>
    art.evaluate(async (el: HTMLImageElement) => {
      const bytes = await (await fetch(el.currentSrc)).arrayBuffer();
      const bitmap = await createImageBitmap(new Blob([bytes]));
      if (![576, 1152].includes(bitmap.width))
        throw Error("Unexpected concept asset dimensions");
      bitmap.close();
      return Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
    });
  // Responsive images expose a density-corrected naturalWidth. Verify the
  // encoded asset instead, then require byte-identical offline content.
  await expect
    .poll(() =>
      art.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const onlineHash = await assetHash();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("studio-home")).toBeVisible();
  await expect
    .poll(() =>
      art.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
      ),
    )
    .toBe(true);
  expect(await assetHash()).toBe(onlineHash);
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("home shape selection reaches the real generator and exact result purchase gates without a new upload screen", async ({
  page,
}, info) => {
  await page.goto("/");
  await english(page);
  await page.getByTestId("home-shape-heart").click();
  await choosePhoto(page, true);
  await expect(page.getByTestId("studio-home")).toHaveCount(0);
  await expect(
    page
      .locator(".shape-chips")
      .getByRole("button", { name: "Heart", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".studio-stage-heading li[aria-current]"),
  ).toContainText("Adjust");
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("adjust.png"),
    fullPage: true,
  });
  await page.locator("button.customer-main-action").click();
  await result(page);
  const image = await page
    .getByTestId("customer-thread-result")
    .getAttribute("src");
  expect(image).toMatch(/^data:image\/png;base64,/);
  await page.screenshot({
    path: info.outputPath("result.png"),
    fullPage: true,
  });
  for (const label of ["Start assembling", "Download PDF"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByTestId("buy-screen")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByTestId("customer-thread-result")).toHaveAttribute(
      "src",
      image!,
    );
  }
  await page.getByRole("button", { name: "Adjust again", exact: true }).click();
  await expect(
    page
      .locator(".shape-chips")
      .getByRole("button", { name: "Heart", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("customer-photo")).toBeVisible();
});

test("existing kit, account, projects and object/lettering entry points remain reachable", async ({
  page,
}, info) => {
  await page.goto("/");
  await english(page);
  await page.getByTestId("product-kind").selectOption("lettering");
  await expect(page.getByTestId("lettering-input")).toBeVisible();
  await page.getByTestId("product-kind").selectOption("object");
  await expect(
    page.getByRole("button", { name: "Choose photo", exact: true }),
  ).toBeVisible();
  await page.getByTestId("customer-account-link").click();
  await expect(page.getByTestId("website-login")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("account.png"),
    fullPage: true,
  });
  const main = page.getByRole("navigation", {
    name: "Main sections",
    exact: true,
  });
  await main.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("studio-home")).toBeVisible();
  await page
    .locator(".studio-closing")
    .getByRole("button", { name: studioHomeText("en", "haveKit"), exact: true })
    .click();
  await expect(page.getByTestId("website-login")).toBeVisible();
  await main.getByRole("button", { name: "Create", exact: true }).click();
  await page
    .locator(".studio-footer")
    .getByRole("button", { name: "My projects" })
    .click();
  await expect(page.getByTestId("studio-home")).not.toBeVisible();
  await noOverflow(page);
});
