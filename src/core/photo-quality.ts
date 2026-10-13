import { portraitPeople } from "./portrait";
import { portraitSampling } from "./portrait-sampling";
import type { PortraitSettings, Shape } from "./types";
export function photoQualityAdvice(
  pixels: Uint8Array,
  n: number,
  shape: Shape,
  portrait: PortraitSettings,
) {
  return portraitPeople(portrait).map((person, index) => {
    const sampling = portraitSampling(pixels, n, shape, person);
    return {
      person: index + 1,
      estimatedRegions:
        !person.regions || person.regions.placement === "proportional-estimate",
      clipped: sampling.some((r) => r.clipped),
      small: sampling.some((r) => r.small),
      flat: sampling.some((r) => r.samples > 0 && r.toneRange < 0.04),
      sampling,
      acceptedQuality: false as const,
    };
  });
}
export type PhotoQualityAdvice = ReturnType<typeof photoQualityAdvice>;
