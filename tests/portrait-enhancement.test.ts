import { expect, test } from "vitest";
import {
  portraitDetailImproves,
  generatePortraitEnhanced,
  type PortraitDetailScore,
} from "../src/core/portrait-enhancement";
import { sourceMidcontrast } from "../src/core/source-midcontrast";
import { sourceMidcontrast as frozenResearchRecipe } from "../scripts/source-midcontrast";
import { viewingMask } from "../src/core/viewing-mask";
import { inside } from "../src/core/geometry";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { validateInstruction } from "../src/core/validation";
import { hash, sequencePayload } from "../src/core/engine";
import { viewingSsimPrepared } from "../src/core/viewing-ssim";

const old: PortraitDetailScore = {
  faces: [{ face: 0.58, nose: 0.43, eyes: 0.64, mouth: 0.65 }],
  white: 0.38,
};
const better: PortraitDetailScore = {
  faces: [{ face: 0.62, nose: 0.5, eyes: 0.67, mouth: 0.69 }],
  white: 0.379,
};
test("batched regional SSIM equals independent full-map evaluation exactly", () => {
  const a = Float32Array.from(
      { length: 25600 },
      (_, k) => 0.6 + 0.2 * Math.sin(k * 0.012),
    ),
    b = Float32Array.from(a, (v, k) => v + 0.03 * Math.cos(k * 0.014)),
    regions = [
      { left: 0.3, top: 0.3, width: 0.2, height: 0.3 },
      { left: 0.5, top: 0.45, width: 0.25, height: 0.2 },
    ],
    boardMask = viewingMask("heart", 160),
    combined = viewingSsimPrepared(a, b, {
      faces: regions,
      regions,
      boardMask,
    });
  for (let k = 0; k < regions.length; k++)
    expect(combined.regions![k]).toEqual(
      viewingSsimPrepared(a, b, { faces: [regions[k]], boardMask }).face,
    );
});
test("physical enhancement requires every face/feature/white gate and finite evidence", () => {
  expect(portraitDetailImproves(old, better)).toBe(true);
  for (const [key, value] of [
    ["face", 0.599],
    ["nose", 0.459],
    ["eyes", 0.634],
    ["mouth", 0.644],
    ["nose", NaN],
  ] as const) {
    const bad = structuredClone(better);
    bad.faces[0][key] = value;
    expect(portraitDetailImproves(old, bad)).toBe(false);
  }
  expect(portraitDetailImproves(old, { ...better, white: 0.391 })).toBe(false);
  expect(portraitDetailImproves(old, { ...better, white: NaN })).toBe(false);
  expect(
    portraitDetailImproves({ faces: [], white: 0 }, { faces: [], white: 0 }),
  ).toBe(false);
  expect(
    portraitDetailImproves(
      { ...old, faces: [old.faces[0], old.faces[0]] },
      { ...better, faces: [better.faces[0], old.faces[0]] },
    ),
  ).toBe(false);
});
test("the sealed older portrait rejection remains rejected by the selection gate", () => {
  expect(
    portraitDetailImproves(
      {
        faces: [
          { face: 0.612201, nose: 0.625123, eyes: 0.657147, mouth: 0.609024 },
        ],
        white: 0.339017,
      },
      {
        faces: [
          { face: 0.629525, nose: 0.641253, eyes: 0.681848, mouth: 0.617911 },
        ],
        white: 0.335621,
      },
    ),
  ).toBe(false);
});
test("a full procedural500px photo preserves pins, monotone progress, provenance and original-target quality", async () => {
  const transform = frameFreePhoto(
      "people",
      [{ left: 0.3, top: 0.23, width: 0.4, height: 0.5 }],
      "circle",
      0.8,
    ),
    b = transform.targetFaces![0],
    pixels = Uint8Array.from({ length: 750000 }, (_, k) => {
      const p = Math.floor(k / 3),
        x = ((p % 500) / 500 - b.left - b.width / 2) / b.width,
        y = (Math.floor(p / 500) / 500 - b.top - b.height / 2) / b.height;
      let v = 1;
      if ((x / 0.56) ** 2 + ((y + 0.17) / 0.77) ** 2 < 1) {
        v = 0.69 + 0.08 * x - 0.025 * Math.cos(y * 8);
        if (y < -0.34 + 0.035 * Math.sin(x * 15))
          v = 0.14 + 0.045 * Math.sin(x * 51 + y * 23);
        for (const ex of [-0.23, 0.23])
          v -=
            0.42 *
            Math.exp(-(((x - ex) / 0.12) ** 2 + ((y + 0.04) / 0.055) ** 2) * 2);
        v -=
          0.2 *
          Math.exp(-(((x - 0.035) / 0.055) ** 2) - ((y - 0.17) / 0.17) ** 2);
        v -=
          0.35 *
          Math.exp(
            -((x / 0.23) ** 2) -
              ((y - 0.34 + 0.06 * (x / 0.23) ** 2) / 0.035) ** 2,
          );
      }
      return Math.round(255 * Math.max(0, Math.min(1, v)));
    }),
    options = {
      pixels,
      resolution: 500,
      lines: 3000,
      mode: "dark" as const,
      profile: leastSquaresProfile(
        standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
        true,
      ),
      kitPreparation: {
        version: "standard-preparation/9" as const,
        sourceHash: "0".repeat(64),
        sourceAspect: 0.8,
        whiteBackground: "automatic" as const,
        transform,
      },
    };
  const baseline = await generateClassicLeastSquares(options),
    progress: number[] = [],
    selected = await generatePortraitEnhanced({
      ...options,
      onProgress: (p) => progress.push(p),
    });
  await validateInstruction(selected);
  expect(selected.algorithm).toBe("classic-greedy/3");
  expect(selected.profile.pins).toEqual(baseline.profile.pins);
  expect(progress.at(-1)).toBe(1);
  expect(progress.every((v, k) => k === 0 || v >= progress[k - 1])).toBe(true);
  if (selected.params.kitPreparation!.tone) {
    expect(selected.params.kitPreparation!.tone!.parentImageHash).toBe(
      baseline.imageHash,
    );
    expect(selected.imageHash).toBe(await hash(sourceMidcontrast(pixels, 500)));
  } else expect(selected.sequenceHash).toBe(baseline.sequenceHash);
}, 60000);
test("source filter is byte-identical to its frozen recipe and never inks white pixels", () => {
  const n = 64,
    input = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
      Math.floor(k / 3) % 47 < 5 ? 255 : 60 + (Math.floor(k / 3) % 180),
    ),
    original = input.slice();
  const result = sourceMidcontrast(input, n);
  expect(result).toEqual(frozenResearchRecipe(input, n));
  expect(input).toEqual(original);
  for (let k = 0; k < input.length; k += 3)
    if (input[k] >= 250) expect(result[k]).toBe(input[k]);
});
test("cached viewing masks match canonical pixel-centre containment including Heart", () => {
  for (const shape of ["circle", "rectangle", "heart"] as const) {
    const n = 64,
      mask = viewingMask(shape, n);
    for (let k = 0; k < n * n; k++)
      expect(mask[k]).toBe(
        +inside(shape, ((k % n) + 0.5) / n, (Math.floor(k / n) + 0.5) / n),
      );
  }
});
test("non-photo/old-preparation jobs preserve the exact ordinary3 guide and immutable inputs", async () => {
  const options = {
    pixels: new Uint8Array(64 * 64 * 3).fill(160),
    resolution: 64,
    lines: 40,
    mode: "dark" as const,
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
      true,
    ),
  };
  const a = await generateClassicLeastSquares(options),
    b = await generatePortraitEnhanced(options);
  expect(b.sequenceHash).toBe(a.sequenceHash);
  expect(b.segments).toEqual(a.segments);
  await validateInstruction(b);
});
test("preparation10 is separately bound and rejects forged/downgraded tone provenance", async () => {
  const transform = frameFreePhoto(
    "people",
    [{ left: 0.28, top: 0.27, width: 0.5, height: 0.45 }],
    "circle",
    0.75,
  );
  const options = {
    pixels: new Uint8Array(500 * 500 * 3).fill(150),
    resolution: 500,
    lines: 25,
    mode: "dark" as const,
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
      true,
    ),
    kitPreparation: {
      version: "standard-preparation/10" as const,
      sourceHash: "0".repeat(64),
      sourceAspect: 0.75,
      whiteBackground: "automatic" as const,
      transform,
      tone: {
        version: "quality-gated-midcontrast/1" as const,
        parentImageHash: "1".repeat(64),
      },
    },
  };
  const i = await generateClassicLeastSquares(options);
  await validateInstruction(i);
  for (const mutate of [
    (v: any) => {
      v.params.kitPreparation.version = "standard-preparation/9";
    },
    (v: any) => {
      delete v.params.kitPreparation.tone;
    },
    (v: any) => {
      v.params.kitPreparation.tone.parentImageHash = v.imageHash;
    },
    (v: any) => {
      v.params.kitPreparation.tone.extra = true;
    },
  ]) {
    const bad = structuredClone(i);
    mutate(bad);
    bad.sequenceHash = await hash(sequencePayload(bad));
    await expect(validateInstruction(bad)).rejects.toThrow(/tone|preparation/i);
  }
});
