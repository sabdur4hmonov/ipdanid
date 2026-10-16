import { test, expect } from "./standard-expert-test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

test.use({ serviceWorkers: "block" });
test("real portrait JPG gallery upload prepares and generates the default standard kit", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  test.skip(
    !existsSync(
      process.env.IP_RASM_PORTRAIT ?? "output/phase10/inputs/synthetic-1.png",
    ),
    "Provide the local synthetic/licensed portrait fixture; photographs must never be committed.",
  );
  const evidence: Record<string, unknown> = { project: info.project.name };
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("/");
    // Convert the original AI-generated fixture to an actual JPEG using the browser codec.
    const raw = readFileSync(
      process.env.IP_RASM_PORTRAIT ?? "output/phase10/inputs/synthetic-1.png",
    );
    const jpg = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      const c = document.createElement("canvas");
      c.width = image.width;
      c.height = image.height;
      c.getContext("2d")!.drawImage(image, 0, 0);
      return c.toDataURL("image/jpeg", 0.96).split(",")[1];
    }, raw.toString("base64"));
    const studio = page.getByTestId("standard-kit-studio");
    const chooser = page.waitForEvent("filechooser");
    await studio
      .getByRole("button", { name: "Galereyadan yuklash", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({
      name: "synthetic-portrait.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpg, "base64"),
    });
    await expect(studio.getByTestId("standard-photo-preview")).toBeVisible();
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await expect(studio.getByTestId("background-status")).not.toHaveAttribute(
      "data-status",
      "processing",
      { timeout: 90000 },
    );
    evidence.background = await studio
      .getByTestId("background-status")
      .getAttribute("data-status");
    evidence.faceInputs = await studio
      .locator('input[aria-label="Face 1 left"]')
      .count();
    await expect(studio.getByTestId("standard-prepared-target")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      studio.getByRole("checkbox", {
        name: "I checked every face, the white background and crop",
        exact: true,
      }),
    ).toBeVisible({ timeout: 15000 });
    await studio
      .getByRole("checkbox", {
        name: "I checked every face, the white background and crop",
        exact: true,
      })
      .check();
    const start = Date.now();
    await studio
      .getByRole("button", { name: "Calculate standard guide", exact: true })
      .click();
    await expect(
      studio.getByRole("button", { name: "Save and assemble", exact: true }),
    ).toBeVisible({ timeout: 60000 });
    evidence.uiGenerationMs = Date.now() - start;
    await expect(studio.getByTestId("standard-thread-result")).toBeVisible();
    expect(
      await studio
        .getByTestId("standard-thread-result")
        .evaluate((c: HTMLCanvasElement) => [c.width, c.height]),
    ).toEqual([1000, 1000]);
    await page.screenshot({
      path: info.outputPath("generated.png"),
      fullPage: true,
    });
    evidence.resolution = await studio
      .getByLabel("Computation resolution", { exact: true })
      .inputValue();
    expect(evidence.resolution).toBe("500");
    expect(evidence.uiGenerationMs).toBeLessThan(15000);
  } finally {
    evidence.errors = errors;
    writeFileSync(
      info.outputPath("observations.json"),
      JSON.stringify(evidence, null, 2),
    );
    await page.screenshot({
      path: info.outputPath("last-screen.png"),
      fullPage: true,
    });
  }
});
