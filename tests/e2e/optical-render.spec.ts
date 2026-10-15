import { test, expect } from "./legacy-test";
import { generateDensity } from "../../src/core/density";
import { createProfile } from "../../src/core/geometry";
import { withPinBasis } from "../../src/core/pin-basis";
import { DEFAULT_ANATOMICAL_IMPORTANCE } from "../../src/core/anatomical-importance";
import { defaultPhysicalContrast } from "../../src/core/physical-contrast";
import { DEFAULT_PORTRAIT } from "../../src/core/portrait";
import { rasterSequence } from "../../src/core/optical";
import { validateInstruction } from "../../src/core/validation";
import { writeFileSync, mkdirSync } from "node:fs";
for (const kind of ["anatomy", "basis"] as const)
  test(`${kind} library canvas equals the immutable optical reconstruction pixel for pixel`, async ({
    page,
  }, info) => {
    const base = createProfile("circle", kind === "basis" ? 240 : 32);
    base.threadMm = 0.1;
    const profile = kind === "basis" ? withPinBasis(base, 240) : base;
    const instruction = await generateDensity(
      {
        profile,
        resolution: 32,
        pixels: Uint8Array.from(
          { length: 32 * 32 * 3 },
          (_, k) => 100 + (Math.floor(k / 3) % 140),
        ),
        lines: 80,
        mode: "dark",
        portrait: {
          ...DEFAULT_PORTRAIT,
          enabled: true,
          regions: {
            reference: "processed-target/sample-centers-v1",
            placement: "manual",
            eyes: { left: 0.25, top: 0.25, width: 0.5, height: 0.1 },
            nose: { left: 0.4, top: 0.4, width: 0.2, height: 0.2 },
            mouth: { left: 0.3, top: 0.65, width: 0.4, height: 0.1 },
          },
        },
      },
      {
        edgeWeight: 2,
        sweeps: 1,
        physical: defaultPhysicalContrast(),
        ...(kind === "anatomy"
          ? { anatomy: DEFAULT_ANATOMICAL_IMPORTANCE }
          : {}),
      },
    );
    await validateInstruction(instruction);
    expect(instruction.algorithm).toBe(
      kind === "anatomy" ? "density-anatomy/10" : "density-pin-basis/11",
    );
    const rgba = Array.from(rasterSequence(instruction)).reduce<number[]>(
      (out, v, k) => {
        out.push(Math.round(v * 255));
        if (k % 3 === 2) out.push(255);
        return out;
      },
      [],
    );
    await page.goto("/");
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await page
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page.locator('input[accept=".json,.txt"]').setInputFiles({
      name: "optical.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(instruction)),
    });
    await expect(page.getByTestId("player-hash")).toHaveText(
      instruction.sequenceHash,
    );
    await page
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    const actual = page.locator("canvas[data-sequence-hash]").first();
    await expect(actual).toHaveAttribute(
      "data-sequence-hash",
      instruction.sequenceHash,
    );
    const mismatch = await actual.evaluate(
      (
        canvas: HTMLCanvasElement,
        { rgba, n, base, pins, shaftMm, widthMm },
      ) => {
        const source = document.createElement("canvas");
        source.width = source.height = n;
        source
          .getContext("2d")!
          .putImageData(
            new ImageData(Uint8ClampedArray.from(rgba), n, n),
            0,
            0,
          );
        const expected = document.createElement("canvas");
        expected.width = canvas.width;
        expected.height = canvas.height;
        const ctx = expected.getContext("2d")!;
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, expected.width, expected.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        const pad = canvas.width * 0.06,
          padY = canvas.height * 0.06;
        ctx.drawImage(
          source,
          pad,
          padY,
          canvas.width - pad * 2,
          canvas.height - padY * 2,
        );
        // The library deliberately shows physical pins over the reconstruction.
        // They are presentation markers, not additional generated strands.
        for (const pin of pins) {
          ctx.fillStyle = "#9a9b90";
          ctx.beginPath();
          ctx.arc(
            pad + pin.x * (canvas.width - pad * 2),
            padY + pin.y * (canvas.height - padY * 2),
            Math.max(1.2, ((shaftMm / widthMm) * (canvas.width - pad * 2)) / 2),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        const a = canvas
            .getContext("2d")!
            .getImageData(0, 0, canvas.width, canvas.height).data,
          b = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0,
          maximum = 0;
        const examples: number[][] = [];
        for (let i = 0; i < a.length; i++)
          if (a[i] !== b[i]) {
            count++;
            maximum = Math.max(maximum, Math.abs(a[i] - b[i]));
            if (examples.length < 8) examples.push([i, a[i], b[i]]);
          }
        return { count, maximum, examples };
      },
      {
        rgba,
        n: 32,
        base: instruction.profile.baseColor,
        pins: instruction.profile.pins,
        shaftMm: instruction.profile.shaftMm,
        widthMm: instruction.profile.widthMm,
      },
    );
    expect(mismatch).toEqual({ count: 0, maximum: 0, examples: [] });
    mkdirSync("output/paint", { recursive: true });
    await actual.screenshot({
      path: `output/paint/${kind}-${info.project.name}-optical.png`,
    });
    writeFileSync(
      `output/paint/${kind}-${info.project.name}-render.json`,
      JSON.stringify(
        {
          algorithm: instruction.algorithm,
          sequenceHash: instruction.sequenceHash,
          connections: instruction.metrics.lines,
          rgbaDifferences: mismatch.count,
          physicalAcceptance: false,
        },
        null,
        2,
      ),
    );
  });
