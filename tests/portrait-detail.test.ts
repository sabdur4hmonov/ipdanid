import { expect, it } from "vitest";
import { contourPortrait } from "../src/core/portrait-detail";
import {
  DEFAULT_PORTRAIT,
  processPortrait,
  validPortrait,
  snapshotPortrait,
} from "../src/core/portrait";
import { createProfile } from "../src/core/geometry";
import { generate, hash } from "../src/core/engine";
import { validateInstruction, fromFile, toTxt } from "../src/core/validation";
import { assertContinuation } from "../src/core/continuation";
const style = "contour-preparation/1" as const;
it("preserves uniform dark/white fields, lightens flat midtones and retains dark feature positions", () => {
  const n = 32;
  for (const value of [0, 40, 255])
    expect(contourPortrait(new Uint8Array(n * n * 3).fill(value), n)).toEqual(
      new Uint8Array(n * n * 3).fill(value),
    );
  const flat = new Uint8Array(n * n * 3).fill(180),
    detail = contourPortrait(flat, n);
  expect(Math.min(...detail)).toBeGreaterThan(180);
  const source = flat.slice();
  for (let y = 8; y < 25; y++)
    for (let x = 14; x < 17; x++)
      source.fill(90, (y * n + x) * 3, (y * n + x) * 3 + 3);
  const copy = source.slice(),
    out = contourPortrait(source, n);
  expect(source).toEqual(copy);
  expect(out[(16 * n + 15) * 3]).toBeLessThan(out[(16 * n + 9) * 3]);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (source[(y * n + x) * 3] === 90)
        expect(out[(y * n + x) * 3]).toBeLessThan(130);
  expect(() => contourPortrait(flat, 10000)).toThrow();
  for (const value of [0, 40, 180, 255])
    expect(
      contourPortrait(new Uint8Array(n * n * 3).fill(value), n, true),
    ).toEqual(new Uint8Array(n * n * 3).fill(value));
  const natural = contourPortrait(source, n, true);
  for (let k = 0; k < source.length; k++)
    expect(Math.abs(natural[k] - source[k])).toBeLessThanOrEqual(20);
  expect(natural[(16 * n + 15) * 3]).toBeLessThan(source[(16 * n + 15) * 3]);
});
it("legacy processing/reset is byte-exact, style is versioned and does not move manual regions", () => {
  const n = 32,
    input = Uint8Array.from(
      { length: n * n * 3 },
      (_, k) => 110 + (Math.floor(k / 3) % 100),
    ),
    settings = { ...DEFAULT_PORTRAIT, enabled: true },
    before = processPortrait(input, n, settings),
    styled = { ...settings, detailStyle: style };
  expect(
    processPortrait(input, n, { ...settings, detailStyle: undefined }),
  ).toEqual(before);
  expect(processPortrait(input, n, styled)).toEqual(contourPortrait(before, n));
  expect(snapshotPortrait(styled).detailStyle).toBe(style);
  expect(
    processPortrait(input, n, {
      ...styled,
      detailStyle: "contour-preparation/2",
    }),
  ).toEqual(contourPortrait(before, n, true));
  expect(() =>
    validPortrait({ ...settings, detailStyle: "future" } as never),
  ).toThrow("style");
  expect(processPortrait(input, n, { ...styled, enabled: false })).toEqual(
    input,
  );
});
it("binds processed style and exact target to real immutable path, import/export and continuation", async () => {
  const n = 32,
    p = createProfile("circle", 32),
    portrait = { ...DEFAULT_PORTRAIT, enabled: true, detailStyle: style };
  p.threadMm = 0.1;
  const input = Uint8Array.from(
      { length: n * n * 3 },
      (_, k) => 110 + (Math.floor(k / 3) % 100),
    ),
    pixels = processPortrait(input, n, portrait),
    o = {
      pixels,
      resolution: n,
      profile: p,
      portrait,
      mode: "dark" as const,
      lines: 150,
      guarded: true,
    },
    i = await generate(o);
  expect(i.imageHash).toBe(await hash(pixels));
  expect(i.params.portrait?.detailStyle).toBe(style);
  await validateInstruction(i);
  expect((await fromFile(toTxt(i))).sequenceHash).toBe(i.sequenceHash);
  expect(() =>
    assertContinuation({ ...o, seed: i }, i.imageHash),
  ).not.toThrow();
  const { detailStyle: _, ...old } = portrait;
  expect(() =>
    assertContinuation({ ...o, portrait: old, seed: i }, i.imageHash),
  ).toThrow("regions");
  expect(() => assertContinuation({ ...o, seed: i }, "0".repeat(64))).toThrow(
    "target",
  );
}, 30000);
