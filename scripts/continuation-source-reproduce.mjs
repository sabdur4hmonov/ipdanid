import { chromium, devices, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
const fixed = process.argv.includes("--fixed");
try {
  const page = await browser.newPage({ ...devices["Pixel 7"] });
  await page.addInitScript(() => {
    const Native = Worker;
    window.requests = [];
    window.Worker = class extends Native {
      postMessage(m, ...rest) {
        if (m.pixels) {
          const r = {
            seedHash: m.seed?.imageHash,
            algorithm: m.seed?.algorithm,
            resolution: m.resolution,
            seedResolution: m.seed?.params.resolution,
            profileMatches:
              !m.seed ||
              JSON.stringify(m.profile) === JSON.stringify(m.seed.profile),
            portraitMatches:
              !m.seed ||
              JSON.stringify(m.portrait) ===
                JSON.stringify(m.seed.params.portrait),
          };
          window.requests.push(r);
          crypto.subtle.digest("SHA-256", m.pixels).then((b) => {
            r.targetHash = [...new Uint8Array(b)]
              .map((x) => x.toString(16).padStart(2, "0"))
              .join("");
          });
        }
        super.postMessage(m, ...rest);
      }
    };
  });
  await page.goto("http://127.0.0.1:5173/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page.getByLabel("Face region Top", { exact: true }).fill("0.2");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await page.getByLabel("Maximum lines", { exact: true }).fill("400");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  const oldHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/orientation-6.jpg");
  await page
    .getByRole("button", { name: "Continue path refinement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeHidden({ timeout: 120000 });
  const requests = await page.evaluate(() => window.requests);
  const r = requests.at(-1);
  if (fixed) expect(r.targetHash).toBe(r.seedHash);
  else expect(r.targetHash).not.toBe(r.seedHash);
  expect(r.profileMatches).toBe(true);
  expect(r.portraitMatches).toBe(true);
  const error = (await page.getByRole("alert").isVisible())
    ? await page.getByRole("alert").textContent()
    : null;
  if (fixed) {
    expect(error).toBeNull();
    await expect(page.locator(".variant-tabs button")).toHaveCount(2);
    await page.locator(".variant-tabs button").first().click();
  } else expect(error).toContain("Continuation requires");
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    oldHash,
  );
  const result = {
    cause:
      "Current photograph used for an older selected variant; target differs, so engine rejection is legitimate. UI failed to associate the recorded source.",
    correctedSourceAssociation: fixed,
    historicalSamePhotoRefusalProven: false,
    oldHash,
    requests,
    error,
  };
  writeFileSync(
    `output/contrast/continuation-source-${fixed ? "after" : "before"}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
