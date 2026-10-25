import { test, expect } from "vitest";
import { physicalPreviewRgba } from "../src/core/physical-preview";
import { renderInstruction } from "../src/core/render";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
for (const profile of standardProfiles(DEFAULT_STANDARD_KIT))
  test(`transferred physical ${profile.shape} preview is byte-identical to existing canvas renderer`, async () => {
    const guide = await generateClassicLeastSquares({
      profile: leastSquaresProfile(profile),
      resolution: 32,
      lines: 40,
      mode: "dark",
      pixels: new Uint8Array(32 * 32 * 3).fill(150),
    });
    await validateInstruction(guide);
    let rendered: Uint8ClampedArray | undefined;
    const surface = {
      width: 1000,
      height: 1000,
      getContext: () => ({
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: (image: { data: Uint8ClampedArray }) => {
          rendered = image.data;
        },
      }),
    };
    const context = {
      canvas: { width: 1000, height: 1000 },
      clearRect: () => {},
      fillRect: () => {},
      drawImage: () => {},
    };
    renderInstruction(context as unknown as CanvasRenderingContext2D, guide, {
      surface: () => surface as unknown as OffscreenCanvas,
    });
    expect(rendered).toBeDefined();
    const rgba = physicalPreviewRgba(guide);
    expect(rgba.byteLength).toBe(4000000);
    expect(Buffer.from(rgba.buffer).equals(Buffer.from(rendered!.buffer))).toBe(
      true,
    );
    expect(() =>
      physicalPreviewRgba({ ...guide, algorithm: "classic-greedy/2" }),
    ).toThrow("physical-preview/combination");
  });
