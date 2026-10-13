import { expect, it } from "vitest";
import {
  sealGenerationInput,
  validateLocalInput,
} from "../src/generation-inputs";
import {
  generationStrategy,
  continuationStrategy,
} from "../src/core/generation-strategy";
import { createProfile } from "../src/core/geometry";
import { generate, hash } from "../src/core/engine";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
it("local input freezes bytes/settings and rejects changed target, recipe and material without changing the guide", async () => {
  const pixels = new Uint8Array(32 * 32 * 3).fill(170),
    profile = createProfile("circle", 32);
  const i = await generate({
    pixels,
    profile,
    resolution: 32,
    lines: 50,
    mode: "dark",
  });
  const input = await sealGenerationInput(
    {
      targetHash: await hash(pixels),
      preparedRevision: "revision-a",
      edits: {
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        brightness: 0,
        contrast: 1,
      },
      resolution: 32,
      profile,
      mode: "dark",
      lines: 50,
      strategy: "continuous",
      objective: i.params.optimization,
    },
    pixels,
  );
  const original = JSON.stringify(i);
  pixels.fill(0);
  profile.threadMm = 0.8;
  expect(input.pixels[0]).toBe(170);
  expect(input.recipe.profile.threadMm).toBe(0.3);
  expect((await validateLocalInput(input, i)).recipeHash).toBe(
    input.recipeHash,
  );
  const corrupt = structuredClone(input);
  corrupt.pixels[0]++;
  await expect(validateLocalInput(corrupt, i)).rejects.toThrow("integrity");
  const altered = structuredClone(input);
  altered.recipe.edits.panY = 0.2;
  await expect(validateLocalInput(altered, i)).rejects.toThrow("integrity");
  const different = structuredClone(i);
  different.profile.threadMm = 0.5;
  await expect(validateLocalInput(input, different)).rejects.toThrow(
    "integrity",
  );
  expect(JSON.stringify(i)).toBe(original);
});
it("group continuation uses the guarded path; generation and refinement capabilities stay distinct", () => {
  const fake: any = {
    algorithm: "group-optical/15",
    params: { portrait: { ...DEFAULT_PORTRAIT, people: {} } },
  };
  expect(generationStrategy(fake)).toBe("guarded");
  expect(continuationStrategy(fake)).toBe("guarded");
  fake.params.portrait = undefined;
  fake.algorithm = "continuous-guarded/6";
  expect(generationStrategy(fake)).toBe("guarded");
  expect(continuationStrategy(fake)).toBe("multiscale");
  fake.algorithm = "density-resolved/12";
  expect(continuationStrategy(fake)).toBe("basis");
});
