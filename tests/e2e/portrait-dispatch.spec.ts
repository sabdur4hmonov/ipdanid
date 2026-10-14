import { test, expect } from "@playwright/test";
test("face photo cannot silently use the general solver; reviewed choices preserve or explicitly replace materials", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
    const W = window.Worker;
    (window as any).__portraitDispatch = [];
    window.Worker = class extends W {
      postMessage(m: any, ...args: any[]) {
        if (m.pixels)
          (window as any).__portraitDispatch.push({
            strategy: m.strategy,
            resolution: m.resolution,
            pins: m.profile.pins.length,
            thread: m.profile.threadMm,
            stock: m.profile.stockMeters,
            portrait: m.portrait,
            profile: m.profile,
          });
        super.postMessage(m, ...(args as [any]));
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page
    .getByLabel("Upload from gallery", { exact: true })
    .setInputFiles("output/portrait/source.jpg");
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByRole("radio", { name: /^People \(1–3\)/ }).click();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 60000 },
  );
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "portrait optimization is off",
  );
  expect(
    await page.evaluate(() => (window as any).__portraitDispatch),
  ).toHaveLength(0);
  await page
    .getByRole("button", { name: "Review eyes, nose and lips", exact: true })
    .click();
  await expect(page.getByTestId("portrait-current-materials")).toBeEnabled();
  await page.getByTestId("portrait-current-materials").click();
  await expect(page.getByTestId("material-summary")).toContainText("0.3 mm");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__portraitDispatch.length))
    .toBe(1);
  let request = await page.evaluate(
    () => (window as any).__portraitDispatch[0],
  );
  expect(request).toMatchObject({
    strategy: "physical",
    resolution: 160,
    pins: 120,
    thread: 0.3,
    stock: 1200,
  });
  expect(request.portrait.regions.placement).toBe("manual");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByTestId("portrait-detail-profile").click();
  await expect(page.getByTestId("material-summary")).toContainText("240");
  await expect(page.getByTestId("material-summary")).toContainText("0.1 mm");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__portraitDispatch.length))
    .toBe(2);
  request = await page.evaluate(() => (window as any).__portraitDispatch[1]);
  expect(request).toMatchObject({
    strategy: "basis",
    resolution: 320,
    pins: 240,
    thread: 0.1,
    stock: 1200,
  });
  expect(request.profile.pinBasis.minimumAngularGapDegrees).toBe(7.5);
  expect(request.profile.pinLayout.phaseDegreesClockwise).toBe(0);
  expect(request.portrait.regions.placement).toBe("manual");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.locator(".result-card").count()).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `output/portrait-dispatch/quality-choices-${test.info().project.name}.png`,
    fullPage: true,
  });
});
