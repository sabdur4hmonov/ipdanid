import { it, expect } from "vitest";
import { generate, hash } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT, snapshotPortrait } from "../src/core/portrait";
import { assertContinuation } from "../src/core/continuation";
it("legitimate seed incompatibilities identify target, material, region, resolution, mode and algorithm without changing immutable seed", async () => {
  const portrait = snapshotPortrait({ ...DEFAULT_PORTRAIT, enabled: true }),
    profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const pixels = new Uint8Array(32 * 32 * 3).fill(170);
  const o = {
    pixels,
    resolution: 32,
    profile,
    portrait,
    mode: "dark" as const,
    lines: 100,
    guarded: true,
  };
  const seed = await generate(o),
    before = JSON.stringify(seed),
    target = await hash(pixels),
    accepted = { ...o, seed };
  expect(() =>
    assertContinuation(accepted, target, ["continuous-guarded/6"]),
  ).not.toThrow();
  for (const [input, digest, code] of [
    [accepted, "0".repeat(64), "target"],
    [
      { ...accepted, profile: { ...profile, threadMm: 0.11 } },
      target,
      "profile",
    ],
    [
      { ...accepted, portrait: { ...portrait, localContrast: 0.5 } },
      target,
      "regions",
    ],
    [{ ...accepted, resolution: 48 }, target, "resolution"],
    [{ ...accepted, mode: "light" as const }, target, "mode"],
  ] as const) {
    try {
      assertContinuation(input, digest, ["continuous-guarded/6"]);
      throw Error("Expected rejection");
    } catch (e) {
      expect((e as any).mismatches).toContain(code);
    }
  }
  expect(() =>
    assertContinuation(accepted, target, ["greedy-optical/4"]),
  ).toThrow("[algorithm]");
  expect(JSON.stringify(seed)).toBe(before);
});
