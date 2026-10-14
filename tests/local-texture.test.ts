import { it, expect } from "vitest";
import {
  LocalTexture,
  DEFAULT_LOCAL_TEXTURE,
  validLocalTexture,
} from "../src/core/local-texture";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT, portraitRegions } from "../src/core/portrait";
import { generateDensity } from "../src/core/density";
import { withPinBasis } from "../src/core/pin-basis";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { validateInstruction } from "../src/core/validation";
const portrait = {
  ...DEFAULT_PORTRAIT,
  enabled: true,
  regions: {
    eyes: portraitRegions(DEFAULT_PORTRAIT).eyes,
    nose: portraitRegions(DEFAULT_PORTRAIT).nose,
    mouth: portraitRegions(DEFAULT_PORTRAIT).mouth,
    placement: "manual" as const,
    reference: "processed-target/sample-centers-v1" as const,
  },
};
for (const n of [64, 320])
  it(`local excess texture sparse gain agrees with independent full sum at ${n}`, () => {
    const p = createProfile("rectangle", 32);
    p.heightMm = 600;
    const size = n * n,
      target = Float64Array.from(
        { length: size },
        (_, k) => 0.8 + 0.015 * Math.sin((k % n) * 0.3),
      ),
      weight = new Float64Array(size).fill(8),
      mask = new Uint8Array(size).fill(1),
      texture = new LocalTexture(
        n,
        p,
        portrait,
        target,
        mask,
        weight,
        DEFAULT_LOCAL_TEXTURE,
      ),
      o = texture.operator;
    expect(o.terms).toBeGreaterThan(0);
    const d = Float64Array.from(
        target,
        (_, k) => 0.8 + ((k % n) % 2 ? 0.04 : -0.04),
      ),
      change = new Float64Array(size),
      marks = new Uint32Array(size);
    const chosen = Uint32Array.from([
      o.b[Math.floor(o.terms * 0.3)],
      o.c[Math.floor(o.terms * 0.5)],
    ]);
    for (const k of chosen) {
      change[k] = -0.02;
      marks[k] = 1;
    }
    const full = (r: Float64Array) => {
      let sum = 0;
      for (let t = 0; t < o.terms; t++) {
        const f = o.beta[t],
          a = o.a[t],
          b = o.b[t],
          c = o.c[t],
          g = r[a] - (1 - f) * r[b] - f * r[c],
          s = target[a] - (1 - f) * target[b] - f * target[c];
        sum += o.weight[t] * Math.max(0, g * g - s * s);
      }
      return sum;
    };
    expect(texture.objective(target)).toBe(0);
    expect(texture.objective(d)).toBeGreaterThan(0);
    expect(texture.objective(d)).toBeCloseTo(full(d), 10);
    expect(texture.gain(d, change, marks, 1, chosen)).toBeCloseTo(
      full(d) - full(Float64Array.from(d, (v, k) => v + change[k])),
      10,
    );
    const control = new LocalTexture(n, p, portrait, target, mask, weight, {
      ...DEFAULT_LOCAL_TEXTURE,
      strength: 0,
    });
    expect(control.objective(d)).toBe(0);
    expect(control.operator.terms).toBe(o.terms);
  });
it("rejects unbound objectives and unsupported seeds before fitting", async () => {
  expect(() =>
    validLocalTexture({ ...DEFAULT_LOCAL_TEXTURE, strength: -1 }),
  ).toThrow("Invalid");
  const options = {
    profile: withPinBasis(
      { ...createProfile("circle", 240), threadMm: 0.1 },
      240,
    ),
    pixels: new Uint8Array(320 * 320 * 3).fill(200),
    resolution: 320,
    lines: 100,
    mode: "dark" as const,
    portrait,
  };
  await expect(
    generateDensity(options, {
      resolved: true,
      physical: defaultPhysicalContrast(),
      edgeWeight: 2,
      sweeps: 1,
      texture: DEFAULT_LOCAL_TEXTURE,
    }),
  ).rejects.toThrow("separate resolved");
  const old = await generateDensity(
    {
      ...options,
      profile: createProfile("circle", 24),
      resolution: 32,
      pixels: new Uint8Array(32 * 32 * 3).fill(200),
    },
    { edgeWeight: 1, sweeps: 1 },
  );
  const unbound = structuredClone(old);
  unbound.params.optimization!.texture = DEFAULT_LOCAL_TEXTURE;
  await expect(validateInstruction(unbound)).rejects.toThrow(
    "Unbound local texture",
  );
}, 30000);
