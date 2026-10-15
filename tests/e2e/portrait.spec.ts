import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";
test.afterEach(async ({ page }, info) => {
  if (page.isClosed()) return;
  const requests = await page
    .evaluate(() => (window as any).__continuationAudit ?? [])
    .catch(() => []);
  await info.attach("all-real-worker-requests", {
    body: JSON.stringify(requests, null, 2),
    contentType: "application/json",
  });
});
test("portrait target, manual regions, low stock, cancellation and immutable stage continuation", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  // Observe the real worker request; no replacement results or source-photo data.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    (window as any).__continuationAudit = [];
    window.Worker = class extends NativeWorker {
      postMessage(message: any, ...rest: any[]) {
        if (message.pixels) {
          const record = {
            jobId: message.jobId,
            strategy: message.strategy,
            resolution: message.resolution,
            seedResolution: message.seed?.params.resolution,
            seedAlgorithm: message.seed?.algorithm,
            mode: message.mode,
            seedMode: message.seed?.params.mode,
            portraitEnabled: message.portrait?.enabled,
            seedImageHash: message.seed?.imageHash,
            profileMatches:
              !message.seed ||
              JSON.stringify(message.profile) ===
                JSON.stringify(message.seed.profile),
            portraitMatches:
              !message.seed ||
              JSON.stringify(message.portrait) ===
                JSON.stringify(message.seed.params.portrait),
            targetHash: "pending",
          };
          (window as any).__continuationAudit.push(record);
          crypto.subtle.digest("SHA-256", message.pixels).then((buffer) => {
            record.targetHash = Array.from(new Uint8Array(buffer), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join("");
          });
        }
        super.postMessage(message, ...(rest as [any]));
      }
    } as typeof Worker;
  });
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  const raw = await page
    .getByLabel("Edited photo", { exact: true })
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await expect(page.getByLabel("Maximum lines", { exact: true })).toHaveValue(
    "20000",
  );
  await revealControl(page.getByLabel("Face region Top", { exact: true }));
  await page.getByLabel("Face region Top", { exact: true }).fill("0.2");
  const processed = await page
    .getByLabel("Exact generation target", { exact: true })
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(processed).not.toBe(raw);
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await revealControl(page.getByLabel("Available thread (m)", { exact: true }));
  await page.getByLabel("Available thread (m)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Calculate thread path", exact: true }),
  ).toBeEnabled();
  // A small CPU stage for the browser regression; exact personal-photo evidence is a separate local script.
  await revealControl(page.getByLabel("Maximum lines", { exact: true }));
  await page.getByLabel("Maximum lines", { exact: true }).fill("400");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await expect(page.getByTestId("supply")).toContainText(
    "Additional thread needed",
  );
  const oldHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  // If refinement plateaued already, there is correctly no continuation CTA.
  const continueButton = page.getByRole("button", {
    name: "Continue path refinement",
    exact: true,
  });
  if (await continueButton.isVisible()) {
    await continueButton.click();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeHidden({ timeout: 120000 });
    const audit = await page.evaluate(
      () => (window as any).__continuationAudit,
    );
    await info.attach("continuation-request-audit", {
      body: JSON.stringify(audit, null, 2),
      contentType: "application/json",
    });
    const request = audit.at(-1);
    expect(request.profileMatches).toBe(true);
    expect(request.portraitMatches).toBe(true);
    expect(request.resolution).toBe(request.seedResolution);
    expect(request.targetHash).toBe(request.seedImageHash);
    await expect(page.locator(".variant-tabs button")).toHaveCount(2);
    await page.locator(".variant-tabs button").first().click();
    await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      oldHash!,
    );
  }
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const exported = JSON.parse(readFileSync((await (await d).path())!, "utf8"))
    .project.instruction;
  expect(exported.params.portrait.face.top).toBe(0.2);
  expect(exported.params.stockPolicy).toBe("estimate");
  expect(exported.metrics.stockShortfallMeters).toBeGreaterThan(0);
  expect(
    exported.metrics.estimatedMeters - exported.profile.stockMeters,
  ).toBeCloseTo(exported.metrics.stockShortfallMeters, 7);
  expect(exported.sequenceHash).toBe(oldHash);
});
