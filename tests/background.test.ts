import { it, expect } from "vitest";
import {
  DEFAULT_PORTRAIT,
  EMPTY_BACKGROUND_MASK,
  decodeBackgroundMask,
  encodeBackgroundMask,
  paintBackgroundMask,
  processPortrait,
  validPortrait,
} from "../src/core/portrait";
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import { fromFile, toTxt, validateInstruction } from "../src/core/validation";

it("manual selection preserves bright and dark foreground, and reset/restore reproduce legacy pixels", () => {
  const n = 160,
    source = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
      const i = Math.floor(k / 3),
        x = i % n,
        y = Math.floor(i / n);
      return x > 25 && x < 135
        ? y < 42
          ? 20
          : y > 140
            ? 35
            : 245
        : (x + y) % 7 < 3
          ? 45
          : 230;
    });
  const s = {
    ...DEFAULT_PORTRAIT,
    enabled: true,
    background: 0.85,
    localContrast: 0.5,
  };
  const before = processPortrait(source, n, s),
    values = new Float32Array(64 * 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) if (x < 6 || x > 57) values[y * 64 + x] = 1;
  const mask = encodeBackgroundMask(values),
    manual = {
      ...s,
      backgroundMode: "manual-light" as const,
      backgroundMask: mask,
    };
  expect(decodeBackgroundMask(mask)).toEqual(values);
  const after = processPortrait(source, n, manual);
  for (const [x, y] of [
    [80, 12],
    [36, 75],
    [124, 75],
    [80, 120],
    [80, 137],
    [80, 80],
  ]) {
    const i = (y * n + x) * 3;
    expect(after.slice(i, i + 3)).toEqual(before.slice(i, i + 3));
  }
  expect(after[(60 * n + 3) * 3]).toBeGreaterThan(before[(60 * n + 3) * 3]);
  expect(
    processPortrait(source, n, { ...manual, backgroundMask: undefined }),
  ).toEqual(before);
  expect(
    processPortrait(source, n, {
      ...manual,
      backgroundMask: EMPTY_BACKGROUND_MASK,
    }),
  ).toEqual(before);
  expect(processPortrait(source, n, { ...manual, background: 0 })).toEqual(
    processPortrait(source, n, { ...s, background: 0 }),
  );
  const painted = paintBackgroundMask(undefined, 0.5, 0.5, 0.07, true);
  expect(painted).not.toBe(EMPTY_BACKGROUND_MASK);
  expect(paintBackgroundMask(painted, 0.5, 0.5, 0.07, false)).toBe(
    EMPTY_BACKGROUND_MASK,
  );
  expect(() =>
    validPortrait({ ...manual, backgroundMask: "f".repeat(1025) }),
  ).toThrow();
  expect(() =>
    validPortrait({ ...manual, backgroundMask: "g".repeat(1024) }),
  ).toThrow();
  expect(() => paintBackgroundMask(mask, NaN, 0.5, 0.05, true)).toThrow();
});

it("the selected background is immutable sequence metadata and survives instruction export", async () => {
  const n = 32,
    portrait = {
      ...DEFAULT_PORTRAIT,
      enabled: true,
      backgroundMode: "manual-light" as const,
      backgroundMask: paintBackgroundMask(undefined, 0.1, 0.5, 0.1, true),
      foregroundMask: paintBackgroundMask(undefined, 0.9, 0.5, 0.1, true),
    };
  const pixels = processPortrait(
    new Uint8Array(n * n * 3).fill(160),
    n,
    portrait,
  );
  const instruction = await generate({
    pixels,
    resolution: n,
    profile: createProfile("circle", 24),
    lines: 200,
    mode: "dark",
    portrait,
  });
  await validateInstruction(instruction);
  expect((await fromFile(toTxt(instruction))).params.portrait).toEqual(
    portrait,
  );
  const tampered = structuredClone(instruction);
  tampered.params.portrait!.backgroundMask = EMPTY_BACKGROUND_MASK;
  await expect(validateInstruction(tampered)).rejects.toThrow();
});

it("foreground restoration recovers original grayscale subject pixels even outside the legacy oval", () => {
  const n = 160,
    foregroundMask = paintBackgroundMask(undefined, 0.04, 0.65, 0.08, true);
  for (const tone of [30, 245]) {
    const source = new Uint8Array(n * n * 3).fill(tone),
      p = {
        ...DEFAULT_PORTRAIT,
        enabled: true,
        backgroundMode: "manual-light" as const,
      };
    const old = processPortrait(source, n, p),
      restored = processPortrait(source, n, { ...p, foregroundMask });
    const i = (104 * n + 6) * 3;
    expect(old[i]).not.toBe(tone);
    expect(restored[i]).toBe(tone);
    expect(restored[(20 * n + 80) * 3]).toBe(old[(20 * n + 80) * 3]);
    expect(
      processPortrait(source, n, {
        ...p,
        foregroundMask: EMPTY_BACKGROUND_MASK,
      }),
    ).toEqual(old);
    expect(
      processPortrait(source, n, {
        ...p,
        foregroundMask,
        backgroundMode: "soften",
      }),
    ).toEqual(old);
    expect(() =>
      validPortrait({ ...p, foregroundMask: "x".repeat(1024) }),
    ).toThrow();
  }
});
