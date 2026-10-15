import { it, expect } from "vitest";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
  pinLabel,
} from "../src/core/standard-kit";
import { generateClassic } from "../src/core/classic";
import { addHeartAccent } from "../src/core/heart-accent";
import { validateInstruction, toTxt, fromFile } from "../src/core/validation";
import { stepVoiceClips } from "../src/core/voice-catalog";
import { spokenKitPin } from "../src/sector-speech";
import { flatten } from "../src/core/engine";
import { qualityCurve, measuredKnee } from "../src/core/line-budget";
it("sector index76 is B-17 in JSON, TXT/player and actual spoken tokens, never pin76 speech", async () => {
  const p = standardProfiles(DEFAULT_STANDARD_KIT)[0];
  expect(pinLabel(p, 76)).toBe("B-17");
  expect(p.pins[76].sectorLabel).toBe("B-17");
  expect(spokenKitPin("uz", p, 76)).toMatch(/^B, .*yetti$/);
  expect(
    stepVoiceClips("uz", 5, 76, 0, undefined, { pins: 240, count: 4 }),
  ).toEqual([
    "step",
    "number-5",
    "from-pin",
    "sector-b",
    "number-17",
    "to-pin",
    "sector-a",
    "number-1",
  ]);
  const pixels = new Uint8Array(32 * 32 * 3).fill(150),
    i = await generateClassic({
      profile: p,
      pixels,
      resolution: 32,
      lines: 40,
      mode: "dark",
    });
  const steps = flatten(i);
  expect(steps.every((s) => s.fromLabel && s.toLabel)).toBe(true);
  const txt = toTxt(i);
  expect(txt).toContain(`${steps[0].fromLabel} ${steps[0].toLabel}`);
  expect((await fromFile(txt)).sequenceHash).toBe(i.sequenceHash);
  const curve = qualityCurve(i, pixels, [10, 20, 30, 40]);
  expect(curve.at(-1)!.meters).toBeCloseTo(i.metrics.estimatedMeters, 8);
  expect(curve.every((p, j) => !j || p.mse <= curve[j - 1].mse + 1e-7)).toBe(
    true,
  );
  expect(
    measuredKnee([
      { connections: 1, mse: 1, meters: 1, hours: 1 },
      { connections: 2, mse: 1, meters: 2, hours: 2 },
      { connections: 3, mse: 1, meters: 3, hours: 3 },
    ]).status,
  ).toBe("inconclusive");
});
it("optional heart colour is a real complete legal segment with every bridge counted and body hash preserved", async () => {
  const p = standardProfiles(DEFAULT_STANDARD_KIT)[2],
    pixels = new Uint8Array(32 * 32 * 3).fill(140);
  const body = await generateClassic({
    profile: p,
    pixels,
    resolution: 32,
    lines: 40,
    mode: "dark",
  });
  const i = await addHeartAccent(body, pixels, "#b31e35");
  await validateInstruction(i);
  expect(i.algorithm).toBe("standard-accent/20");
  expect(i.segments[0]).toEqual(body.segments[0]);
  expect(new Set(i.segments[1].path).size).toBe(240);
  expect(i.segments[1].path[0]).toBe(0);
  expect(i.segments[1].path.at(-1)).toBe(0);
  expect(i.metrics.lines).toBe(
    body.metrics.lines + i.segments[1].path.length - 1,
  );
  expect(i.metrics.estimatedMeters).toBeGreaterThan(
    body.metrics.estimatedMeters,
  );
  expect(i.params.accent!.bodySequenceHash).toBe(body.sequenceHash);
  expect((await fromFile(toTxt(i))).sequenceHash).toBe(i.sequenceHash);
  const changed = structuredClone(i);
  changed.params.accent!.bodySequenceHash = "0".repeat(64);
  await expect(validateInstruction(changed)).rejects.toThrow("body-identity");
  await expect(
    addHeartAccent(body, new Uint8Array(pixels.length), "#b31e35"),
  ).rejects.toThrow("source");
});
