import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
test("manual facial sampling exposes small/clipped windows without blocking generation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  const panel = page.getByTestId("portrait-sampling"),
    mouth = panel.locator('[data-feature="mouth"]');
  await expect(panel).toBeVisible();
  await page
    .getByTestId("region-editor")
    .getByRole("button", { name: "Mouth", exact: true })
    .click();
  await revealControl(page.getByLabel("Mouth Height", { exact: true }));
  await page.getByLabel("Mouth Height", { exact: true }).fill("0.03");
  await expect(mouth).toHaveAttribute("data-small", "true");
  await expect
    .poll(async () => Number(await mouth.getAttribute("data-height")))
    .toBeCloseTo(4.77, 6);
  await expect(panel.getByText(/shorter side below 8 pixels/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Calculate thread path", exact: true }),
  ).toBeEnabled();
  await revealControl(page.getByLabel("Computation resolution", { exact: true }));
  await page.getByLabel("Computation resolution", { exact: true }).selectOption("192");
  await expect
    .poll(async () => Number(await mouth.getAttribute("data-height")))
    .toBeCloseTo(5.724, 6);
  // The same source extent gets 20% more samples, without a framing zoom.
  await revealControl(page.getByLabel("Mouth Height", { exact: true }));
  await page.getByLabel("Mouth Height", { exact: true }).fill("0.08");
  await expect(mouth).toHaveAttribute("data-small", "false");
  await expect
    .poll(async () => Number(await mouth.getAttribute("data-height")))
    .toBeCloseTo(15.28, 6);
  await revealControl(page.getByLabel("Mouth Width", { exact: true }));
  await page.getByLabel("Mouth Width", { exact: true }).fill("0.1");
  await revealControl(page.getByLabel("Mouth Left", { exact: true }));
  await page.getByLabel("Mouth Left", { exact: true }).fill("0");
  await revealControl(page.getByLabel("Mouth Top", { exact: true }));
  await page.getByLabel("Mouth Top", { exact: true }).fill("0");
  await expect(mouth).toHaveAttribute("data-clipped", "true");
  await expect(panel.getByText(/outside the board/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Calculate thread path", exact: true }),
  ).toBeEnabled();
  await revealControl(page.getByRole("button", { name: "Rectangle", exact: true, includeHidden: true }));
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await expect(mouth).toHaveAttribute("data-clipped", "false");
  await expect(mouth).toHaveAttribute("data-inside", "1");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("uz");
  await expect(
    panel.getByRole("heading", {
      name: "Hisoblashdan oldin yuz detallarini tekshiring",
    }),
  ).toBeVisible();
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("ru");
  await expect(
    panel.getByRole("heading", { name: "Проверьте детали лица до расчёта" }),
  ).toBeVisible();
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).uncheck();
  await expect(panel).toHaveCount(0);
});
