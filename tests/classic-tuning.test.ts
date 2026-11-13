import { test, expect } from "vitest";
import {
  generateClassicLeastSquares,
  leastSquaresImportance,
  leastSquaresProfile,
  classicLsDefaults,
  CLASSIC_LS_DEFAULTS,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { frameCustomerHeads } from "../src/core/customer-framing";
import { validateInstruction } from "../src/core/validation";
import { hash, sequencePayload } from "../src/core/engine";
import {
  decodeGenerationRecipe,
  serverClassicTuning,
} from "../server/generation-recipe";
import { recipe } from "./generation-recipe.test";

const p = leastSquaresProfile(
  standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
);
const proof = {
  version: "standard-preparation/4" as const,
  sourceHash: "0".repeat(64),
  sourceAspect: 1,
  whiteBackground: "automatic" as const,
  transform: frameCustomerHeads(
    [{ left: 0.3, top: 0.2, width: 0.4, height: 0.5 }],
    "circle",
    1,
  ),
};
const n = 64;
const pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
  const i = Math.floor(k / 3),
    x = i % n,
    y = Math.floor(i / n);
  return Math.round(40 + 200 * ((x * 7 + y * 3) % n) / n);
});
const base = {
  pixels,
  profile: p,
  resolution: n,
  lines: 320,
  mode: "dark" as const,
  kitPreparation: proof,
};

test("classic-reference/3 stays the library default and is bit-identical when named explicitly", async () => {
  const a = await generateClassicLeastSquares(base),
    b = await generateClassicLeastSquares({
      ...base,
      classicTuning: "classic-reference/3",
    });
  expect(a.params.classic).toMatchObject({
    version: "classic-reference/3",
    darknessGamma: 1.6,
    importanceAmplitude: 1,
  });
  expect(b.segments[0].path).toEqual(a.segments[0].path);
  expect(b.sequenceHash).toBe(a.sequenceHash);
  await validateInstruction(a);
  // Amplitude 1 keeps the historical 1 + gaussian importance exactly.
  const faces = proof.transform.targetFaces ?? [];
  expect(leastSquaresImportance(n, faces, 1)).toEqual(
    leastSquaresImportance(n, faces),
  );
});

test("classic-reference/4 records its own settings, validates and changes only the scoring", async () => {
  const three = await generateClassicLeastSquares(base),
    four = await generateClassicLeastSquares({
      ...base,
      classicTuning: "classic-reference/4",
    });
  expect(four.algorithm).toBe("classic-greedy/3");
  expect(four.params.classic).toMatchObject({
    version: "classic-reference/4",
    darknessGamma: 1.2,
    importanceAmplitude: 3,
    lineDarkness: 0.08,
    minGap: 25,
  });
  expect(Object.keys(four.params.classic!)).toEqual(
    Object.keys(three.params.classic!),
  );
  expect(four.segments[0].path).toHaveLength(321);
  expect(four.segments[0].path).not.toEqual(three.segments[0].path);
  await validateInstruction(four);
  expect(classicLsDefaults("classic-reference/3")).toEqual({
    ...CLASSIC_LS_DEFAULTS,
  });
  expect(() =>
    classicLsDefaults("classic-reference/5" as never),
  ).toThrow("classic3/tuning");
});

test("a tampered tuning cannot pass validation", async () => {
  const four = await generateClassicLeastSquares({
    ...base,
    classicTuning: "classic-reference/4",
  });
  for (const change of [
    { darknessGamma: 1.6 },
    { importanceAmplitude: 1 },
    { version: "classic-reference/3" },
  ]) {
    const forged = structuredClone(four) as typeof four & {
      params: { classic: Record<string, unknown> };
    };
    Object.assign(forged.params.classic, change);
    forged.sequenceHash = await hash(sequencePayload(forged));
    await expect(validateInstruction(forged)).rejects.toThrow();
  }
});

test("a resumed seed keeps its tuning; naming a different tuning is refused", async () => {
  const seed = await generateClassicLeastSquares({
      ...base,
      lines: 200,
      classicTuning: "classic-reference/4",
    }),
    resumed = await generateClassicLeastSquares({ ...base, seed }),
    fresh = await generateClassicLeastSquares({
      ...base,
      classicTuning: "classic-reference/4",
    });
  expect(resumed.params.classic?.version).toBe("classic-reference/4");
  expect(resumed.segments[0].path).toEqual(fresh.segments[0].path);
  await expect(
    generateClassicLeastSquares({
      ...base,
      seed,
      classicTuning: "classic-reference/3",
    }),
  ).rejects.toThrow("classic3/seed-identity");
});

test("server selects /4 for new protected works, keeps /3 hashes for rollback and rejects bad config", () => {
  expect(serverClassicTuning({})).toBe("classic-reference/4");
  expect(serverClassicTuning({ CLASSIC_TUNING: "3" })).toBe(
    "classic-reference/3",
  );
  expect(() => serverClassicTuning({ CLASSIC_TUNING: "5" })).toThrow();
  const b = recipe(),
    four = decodeGenerationRecipe(b, DEFAULT_STANDARD_KIT),
    three = decodeGenerationRecipe(
      b,
      DEFAULT_STANDARD_KIT,
      "classic-reference/3",
    );
  expect(four.options.classicTuning).toBe("classic-reference/4");
  expect(three.options.classicTuning).toBe("classic-reference/3");
  expect(four.recipeHash).not.toBe(three.recipeHash);
});
