import type { PortraitSettings, Shape } from "./types";
import { contains, portraitRegions, validPortrait } from "./portrait";
import { inside } from "./geometry";

// Diagnostics on the exact source-derived target. These are manual windows,
// not detected anatomy, a blur classifier, or a physical quality acceptance.
export function portraitSampling(
  pixels: Uint8Array,
  n: number,
  shape: Shape,
  portrait: PortraitSettings,
) {
  validPortrait(portrait);
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 320 ||
    pixels.length !== n * n * 3 ||
    !["circle", "rectangle", "heart"].includes(shape)
  )
    throw Error("Invalid portrait sampling target");
  const regions = portraitRegions(portrait);
  return (["eyes", "nose", "mouth"] as const).map((key) => {
    const box = regions[key],
      values: number[] = [];
    let windowSamples = 0;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const nx = x / (n - 1),
          ny = y / (n - 1);
        if (!contains(box, nx, ny)) continue;
        windowSamples++;
        if (!inside(shape, nx, ny)) continue;
        const i = (y * n + x) * 3;
        values.push(
          (0.2126 * pixels[i] +
            0.7152 * pixels[i + 1] +
            0.0722 * pixels[i + 2]) /
            255,
        );
      }
    values.sort((a, b) => a - b);
    const percentile = (p: number) =>
      values.length ? values[Math.floor((values.length - 1) * p)] : 0;
    const widthPixels = box.width * (n - 1),
      heightPixels = box.height * (n - 1);
    return {
      key,
      widthPixels,
      heightPixels,
      samples: values.length,
      windowSamples,
      insideFraction: windowSamples ? values.length / windowSamples : 0,
      toneRange: percentile(0.95) - percentile(0.05),
      small: Math.min(widthPixels, heightPixels) < 8,
      clipped: values.length < windowSamples || values.length === 0,
    };
  });
}
export type PortraitSampling = ReturnType<typeof portraitSampling>;
