import { test, expect } from "@playwright/test";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { photoCases, gallery, english, png } from "./phase12-cases";
import { customerFlowText } from "../../src/customer-flow-i18n";
import { DEFAULT_CUSTOMER_LINES } from "../../src/customer-defaults";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
const evidenceRoot = newEvidenceRoot(
  process.env.IP_RASM_CUSTOMER_EVIDENCE || "output/current-customer/screens",
);
test.use({ serviceWorkers: "block" });
test("three customer screens preserve real mouse/touch crop through regeneration and signed PDF", async ({
  page,
  context,
}, info) => {
  test.setTimeout(240000);
  test.skip(
    !existsSync(photoCases[0].source),
    "Local synthetic acceptance portrait is not committed.",
  );
  const out = `${evidenceRoot}/${info.project.name}`;
  mkdirSync(out, { recursive: true });
  await page.goto("/");
  const flow = page.getByTestId("customer-flow");
  await expect(flow).toHaveAttribute("data-screen", "start");
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    await page.getByTestId("customer-menu").locator("summary").click();
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    await page.getByTestId("customer-menu").locator("summary").click();
    await expect(
      page.getByRole("button", {
        name: customerFlowText(locale, "gallery"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: customerFlowText(locale, "camera"),
        exact: true,
      }),
    ).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(
      /240|460|0\.12|classic|r1|Circle 46|Standard kit/,
    );
    await page.screenshot({
      path: out + `/1-start-${locale}.png`,
      fullPage: true,
    });
  }
  await page.screenshot({ path: out + "/1-start.png", fullPage: true });
  await gallery(page, photoCases[0]);
  const image = page.getByTestId("customer-photo"),
    surface = page.getByTestId("customer-gesture-surface"),
    slider = page.getByRole("slider", { name: "Zoom", exact: true });
  await expect(
    page.getByRole("button", { name: "Create", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const baseline = await png(page, "customer-photo"),
    baselineFrame = await image.getAttribute("data-framing");
  await page.screenshot({ path: out + "/2-adjust.png", fullPage: true });
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.56, box.y + box.height * 0.46, {
    steps: 5,
  });
  await page.mouse.up();
  await expect.poll(() => png(page, "customer-photo")).not.toBe(baseline);
  await slider.fill("1.15");
  await page.getByRole("button", { name: "Rotate", exact: false }).click();
  expect(
    JSON.parse((await image.getAttribute("data-framing"))!).framing.rotation,
  ).toBe(1);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => png(page, "customer-photo")).toBe(baseline);
  expect(await image.getAttribute("data-framing")).toBe(baselineFrame);
  if (info.project.name === "mobile-browser") {
    const cdp = await context.newCDPSession(page),
      x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 45, y, id: 1 },
        { x: x + 45, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 70, y, id: 1 },
        { x: x + 70, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -120);
  }
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeGreaterThan(1.05);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await slider.fill("1.08");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.53, box.y + box.height * 0.48, {
    steps: 3,
  });
  await page.mouse.up();
  const adjusted = await png(page, "customer-photo"),
    position = await image.getAttribute("data-framing");
  await page.getByRole("button", { name: "Before", exact: true }).click();
  await expect.poll(() => png(page, "customer-photo")).not.toBe(adjusted);
  await page.getByRole("button", { name: "After", exact: true }).click();
  await expect.poll(() => png(page, "customer-photo")).toBe(adjusted);
  await expect(
    page.getByRole("checkbox", { name: "Show shoulders", exact: true }),
  ).toHaveCount(0);
  expect(JSON.parse(position!).framing.keepShoulders).toBe(true);
  const start = Date.now();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  const firstMs = Date.now() - start;
  expect(firstMs).toBeLessThan(15000);
  await expect(page.locator(".customer-effort")).toContainText(
    String(DEFAULT_CUSTOMER_LINES),
  );
  const result = await png(page, "customer-thread-result");
  writeFileSync(out + "/app.png", Buffer.from(result, "base64"));
  await page.screenshot({ path: out + "/3-result.png", fullPage: true });
  await page.getByRole("button", { name: "Adjust again", exact: true }).click();
  expect(await image.getAttribute("data-framing")).toBe(position);
  expect(await png(page, "customer-photo")).toBe(adjusted);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  expect(await png(page, "customer-thread-result")).toBe(result);
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await unlockKitGuide(page);
  copyFileSync((await (await pdf).path())!, out + "/guide.pdf");
  await expect(page.getByTestId("customer-result")).toBeVisible();
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  await expect(page.getByTestId("player-hash")).toBeVisible();
  const json = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project JSON", exact: true })
    .last()
    .click();
  const i = await validateInstruction(
    JSON.parse(readFileSync((await (await json).path())!, "utf8")).project
      .instruction,
  );
  expect(i.algorithm).toBe("classic-greedy/3");
  writeFileSync(out + "/guide.json", JSON.stringify(i, null, 2));
  expect(i.params.kitPreparation!.transform).toEqual(JSON.parse(position!));
  await context.setOffline(true);
  await expect(page.getByTestId("player-hash")).toBeVisible();
  writeFileSync(
    out + "/result.json",
    JSON.stringify(
      {
        firstMs,
        lines: i.metrics.lines,
        hash: i.sequenceHash,
        gesturePixelsChanged: true,
        resetExact: true,
        readjustPreserved: true,
        regenerationExact: true,
        signedPdf: true,
        locales: 4,
      },
      null,
      2,
    ),
  );
});
test("auto-fit reaches the result in three taps including the native file selection", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  test.skip(
    !existsSync(photoCases[0].source),
    "Local synthetic acceptance portrait is not committed.",
  );
  await page.goto("/");
  // Photo-first flow: shapes appear only after the chosen photo is ready.
  await expect(page.getByTestId("customer-flow")).toHaveAttribute("data-screen", "start");
  await expect(page.getByRole("button", { name: "Doira", exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { taps: string[] }).taps = [];
    document.addEventListener(
      "click",
      (e) => {
        const b = (e.target as Element).closest("button");
        if (b)
          (window as unknown as { taps: string[] }).taps.push(
            b.textContent!.trim(),
          );
      },
      true,
    );
  });
  await gallery(page, photoCases[0]);
  await expect(page.getByRole("button", { name: "Doira", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Yaratish", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  const clicks = await page.evaluate(
    () => (window as unknown as { taps: string[] }).taps,
  );
  expect(clicks).toEqual(["Galereyadan tanlash", "Yaratish"]);
  mkdirSync(`${evidenceRoot}/${info.project.name}`, { recursive: true });
  writeFileSync(
    `${evidenceRoot}/${info.project.name}/three-taps.json`,
    JSON.stringify(
      {
        inAppButtons: clicks,
        filePickerSelections: 1,
        totalTaps: 3,
        extraReviewCheckbox: false,
      },
      null,
      2,
    ),
  );
});

test("photo failure keeps all four customer languages plain and generation unavailable", async ({
  page,
}) => {
  await page.goto("/");
  const file = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Galereyadan tanlash", exact: true })
    .click();
  await (
    await file
  ).setFiles({
    name: "broken.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("invalid JPEG"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    await page.getByTestId("customer-menu").locator("summary").click();
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    await page.getByTestId("customer-menu").locator("summary").click();
    await expect(page.getByRole("alert")).toContainText(
      customerFlowText(locale, "error"),
    );
    await expect(
      page.getByRole("button", {
        name: customerFlowText(locale, "generate"),
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.getByTestId("customer-flow")).toHaveAttribute("data-screen", "adjust");
  }
});

test("one crashed local photo worker recovers automatically before Create", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  test.skip(
    !existsSync(photoCases[0].source),
    "Local synthetic portrait intentionally excluded from Git.",
  );
  await page.addInitScript(() => {
    const Real = window.Worker;
    let attempts = 0;
    (window as unknown as { photoWorkerAttempts: number }).photoWorkerAttempts =
      0;
    window.Worker = class extends Real {
      constructor(url: string | URL, opts?: WorkerOptions) {
        const photo = String(url).includes("photo-prepare");
        if (photo) {
          attempts++;
          (
            window as unknown as { photoWorkerAttempts: number }
          ).photoWorkerAttempts = attempts;
        }
        super(
          photo && attempts === 1
            ? URL.createObjectURL(
                new Blob(
                  [
                    'throw Error("Simulated local photo worker startup failure")',
                  ],
                  { type: "application/javascript" },
                ),
              )
            : url,
          opts,
        );
      }
    };
  });
  await page.goto("/");
  await gallery(page, photoCases[0]);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { photoWorkerAttempts: number })
          .photoWorkerAttempts,
    ),
  ).toBe(2);
  await page.getByRole("button", { name: "Yaratish", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  mkdirSync(`${evidenceRoot}/${info.project.name}`, { recursive: true });
  writeFileSync(
    `${evidenceRoot}/${info.project.name}/worker-recovery.json`,
    JSON.stringify(
      { actualFirstWorkerCrashed: true, attempts: 2, realPortraitResult: true },
      null,
      2,
    ),
  );
});
