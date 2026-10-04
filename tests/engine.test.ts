import { describe, it, expect } from "vitest";
import { generate, flatten } from "../src/core/engine";
import { createProfile, inside } from "../src/core/geometry";
import {
  validateInstruction,
  confirm,
  progressFor,
  mergeProgress,
  toTxt,
  fromFile,
} from "../src/core/validation";
import { spokenPin } from "../src/i18n";
import { imageDimensions } from "../src/core/image";
const n = 48;
const pixels = Uint8Array.from({ length: n * n * 3 }, (_, i) => {
  const x = Math.floor(i / 3) % n,
    y = Math.floor(i / 3 / n);
  return Math.hypot(x - n / 2, y - n / 2) < n * 0.3 ? 65 : 235;
});
describe("real photo-to-path outcomes", () => {
  it("supports actual rectangular dimensions, rejects a deformed circle and infeasible pin spacing", async () => {
    const p = createProfile("rectangle", 60, "dark", {
      widthMm: 400,
      heightMm: 300,
    });
    const i = await generate({
      pixels,
      resolution: n,
      profile: p,
      lines: 100,
      mode: "dark",
    });
    expect(i.profile.heightMm).toBe(300);
    await validateInstruction(i);
    expect(() =>
      createProfile("circle", 60, "dark", { widthMm: 400, heightMm: 300 }),
    ).toThrow();
    const crowded = createProfile("circle", 240, "dark", {
      widthMm: 50,
      heightMm: 50,
    });
    await expect(
      generate({
        pixels,
        resolution: n,
        profile: crowded,
        lines: 100,
        mode: "dark",
      }),
    ).rejects.toThrow(/spacing/);
  });
  it("deterministic path materially improves simulated error; all instructions continuous and legal", async () => {
    const o = {
      pixels,
      resolution: n,
      profile: createProfile("circle", 60),
      lines: 160,
      mode: "dark" as const,
    };
    const a = await generate(o),
      b = await generate(o);
    expect(a.sequenceHash).toBe(b.sequenceHash);
    expect(a.metrics.reconstructionMse).toBeLessThan(
      a.metrics.baselineMse * 0.7,
    );
    expect(a.metrics.lines).toBeGreaterThan(40);
    const steps = flatten(a);
    for (let i = 1; i < steps.length; i++)
      expect(steps[i].from).toBe(steps[i - 1].to);
    expect(await validateInstruction(a)).toBe(a);
    expect(Object.isFrozen(a.segments[0].path)).toBe(true);
  });
  it.each(["circle", "rectangle", "heart"] as const)(
    "supports %s geometry without invalid pins and masking",
    async (shape) => {
      const profile = createProfile(shape, 60);
      const a = await generate({
        pixels,
        resolution: n,
        profile,
        lines: 100,
        mode: "dark",
      });
      await validateInstruction(a);
      for (const s of flatten(a)) {
        expect(profile.pins[s.from]).toBeDefined();
        expect(s.from).not.toBe(s.to);
      }
      expect(inside(shape, 0.5, 0.65)).toBe(true);
      if (shape === "heart") expect(inside(shape, 0.5, 0.03)).toBe(false);
    },
  );
  it("light thread on dark base reduces error", async () => {
    const a = await generate({
      pixels,
      resolution: n,
      profile: createProfile("circle", 48, "light"),
      lines: 120,
      mode: "light",
    });
    expect(a.metrics.reconstructionMse).toBeLessThan(a.metrics.baselineMse);
  });
  it("multicolor produces real continuous independent segments and color-specific length", async () => {
    const colors = Uint8Array.from({ length: n * n * 3 }, (_, i) => {
      const x = Math.floor(i / 3) % n;
      return (
        x < n / 3
          ? [50, 70, 90]
          : x < (n * 2) / 3
            ? [165, 75, 78]
            : [60, 120, 115]
      )[i % 3];
    });
    const a = await generate({
      pixels: colors,
      resolution: n,
      profile: createProfile("rectangle", 60, "color"),
      lines: 210,
      mode: "color",
    });
    expect(a.segments.length).toBe(3);
    expect(a.metrics.reconstructionMse).toBeLessThan(a.metrics.baselineMse);
    await validateInstruction(a);
    expect(Object.keys(a.metrics.perColorMeters)).toHaveLength(3);
  });
  it("honors stock cap and bounded computation and cancellation", async () => {
    const p = createProfile("circle", 48);
    p.stockMeters = 2;
    const a = await generate({
      pixels,
      resolution: n,
      profile: p,
      lines: 150,
      mode: "dark",
    });
    expect(a.metrics.estimatedMeters).toBeLessThanOrEqual(2);
    await expect(
      generate({
        pixels,
        resolution: n,
        profile: p,
        lines: 3001,
        mode: "dark",
      }),
    ).rejects.toThrow();
    await expect(
      generate({
        pixels,
        resolution: n,
        profile: p,
        lines: 100,
        mode: "dark",
        cancelled: () => true,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects corrupted/imported paths and versions, supports JSON and TXT exact roundtrip", async () => {
    const a = await generate({
      pixels,
      resolution: n,
      profile: createProfile("circle", 48),
      lines: 50,
      mode: "dark",
    });
    expect((await fromFile(toTxt(a))).sequenceHash).toBe(a.sequenceHash);
    expect((await fromFile(JSON.stringify(a))).sequenceHash).toBe(
      a.sequenceHash,
    );
    const bad = structuredClone(a);
    bad.segments[0].path[1] = 999;
    await expect(validateInstruction(bad)).rejects.toThrow();
    const tampered = structuredClone(a);
    tampered.profile.widthMm = 450;
    await expect(validateInstruction(tampered)).rejects.toThrow(/integrity/);
    const version = structuredClone(a);
    (version as unknown as { schema: string }).schema = "future";
    await expect(validateInstruction(version)).rejects.toThrow(/version/);
  });
  it("progress confirms explicitly, supports undo and never auto-overwrites conflicts", async () => {
    const a = await generate({
      pixels,
      resolution: n,
      profile: createProfile("circle", 48),
      lines: 60,
      mode: "dark",
    });
    const initial = progressFor(a),
      p = confirm(initial, 10, a),
      remote = confirm(initial, 15, a);
    expect(initial.confirmed).toBe(0);
    expect(confirm(p, 2, a).confirmed).toBe(2);
    expect(mergeProgress(p, remote)).toEqual({ progress: p, conflict: true });
    expect(() => confirm(p, 999, a)).toThrow();
  });
});
describe("safe input and localized identifiers", () => {
  it("rejects unsupported and truncated image headers before decode", () => {
    expect(() => imageDimensions(new Uint8Array([1, 2]))).toThrow();
    const b = new Uint8Array(24);
    b.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(b.buffer).setUint32(16, 5000);
    new DataView(b.buffer).setUint32(20, 5000);
    expect(imageDimensions(b)).toMatchObject({ width: 5000, height: 5000 });
  });
  it("has explicit Uzbek zero, tens and hundreds", () => {
    expect(spokenPin("uz", 0)).toBe("nol");
    expect(spokenPin("uz", 42)).toBe("qirq ikki");
    expect(spokenPin("uz", 119)).toBe("bir yuz o‘n to‘qqiz");
  });
});
