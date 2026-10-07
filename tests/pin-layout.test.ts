import { it, expect } from "vitest";
import { createProfile } from "../src/core/geometry";
import {
  circleLayout,
  withCircleLayout,
  validateProfileLayout,
  templateLabel,
} from "../src/core/pin-layout";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { validateInstruction, progressFor } from "../src/core/validation";
it("rotates only the circular nail basis, retains material and preserves the default board", () => {
  const p = createProfile("circle", 240);
  p.threadMm = 0.1;
  const before = JSON.stringify(p),
    l = circleLayout(0.75),
    r = withCircleLayout(p, l);
  expect(JSON.stringify(p)).toBe(before);
  expect(createProfile("circle", 240).pinLayout).toBeUndefined();
  expect(r.pins[0].x * 400).toBeCloseTo(202.51320235, 6);
  expect(r.pins[0].y * 400).toBeCloseTo(8.01644911, 6);
  for (const pin of r.pins) {
    expect(Math.hypot(pin.x - 0.5, pin.y - 0.5) * 400).toBeCloseTo(192, 10);
    const original = p.pins[pin.id];
    expect(
      Math.hypot(pin.x - original.x, pin.y - original.y) * 400,
    ).toBeCloseTo(2 * 192 * Math.sin((0.75 * Math.PI) / 360), 10);
    const a = templateLabel(r, pin.id);
    expect(a.x).toBeGreaterThan(0);
    expect(a.x).toBeLessThan(400);
    expect(a.y).toBeGreaterThan(0);
    expect(a.y).toBeLessThan(400);
  }
  expect({
    ...r,
    id: p.id,
    version: p.version,
    pins: p.pins,
    pinLayout: undefined,
  }).toEqual({ ...p, pinLayout: undefined });
  validateProfileLayout(r);
  const recorded = structuredClone(r.pins);
  recorded[6].x += Number.EPSILON; // Different runtime's last-bit trig rounding.
  expect(withCircleLayout(p, l, recorded).pins).toEqual(recorded);
  expect(() => withCircleLayout(p, l, [...recorded.slice(1)])).toThrow(
    "pin count",
  );
  const corrupt = structuredClone(recorded);
  corrupt[6].x = NaN;
  expect(() => withCircleLayout(p, l, corrupt)).toThrow("coordinates");
  const boxes = r.pins.map((pin) => templateLabel(r, pin.id));
  for (let j = 0; j < boxes.length; j++)
    for (let k = j + 1; k < boxes.length; k++)
      expect(
        Math.abs(boxes[j].x - boxes[k].x) > 4 ||
          Math.abs(boxes[j].y - boxes[k].y) > 2.2,
      ).toBe(true);
  expect(() => withCircleLayout(createProfile("heart"), l)).toThrow("circular");
  expect(() => circleLayout(NaN)).toThrow();
  expect(() => circleLayout(360)).toThrow();
});
it("heart template leaders follow the actual concave perimeter rather than circle radius", () => {
  const p = createProfile("heart", 160);
  const original = structuredClone(p.pins),
    labels = p.pins.map((pin) => templateLabel(p, pin.id));
  expect(labels[0].x).toBeCloseTo(200, 6);
  expect(labels[0].y).toBeCloseTo(p.pins[0].y * 400 + 8, 6);
  for (let j = 0; j < labels.length; j++) {
    const pin = p.pins[j],
      label = labels[j];
    expect(
      Math.hypot(label.x - pin.x * 400, label.y - pin.y * 400),
    ).toBeCloseTo(j % 2 ? 14 : 8, 6);
    for (let k = j + 1; k < labels.length; k++)
      expect(
        Math.abs(label.x - labels[k].x) > 4 ||
          Math.abs(label.y - labels[k].y) > 2.2,
      ).toBe(true);
  }
  expect(p.pins).toEqual(original);
});
it("hash binds actual layout metadata and coordinates; imports reject mislabeled boards even with a valid rehash", async () => {
  const p = withCircleLayout(createProfile("circle", 48), circleLayout(0.75));
  const i = await generate({
    profile: p,
    pixels: new Uint8Array(32 * 32 * 3).fill(130),
    resolution: 32,
    lines: 200,
    mode: "dark",
    guarded: true,
  });
  await validateInstruction(i);
  expect(progressFor(i).confirmed).toBe(0);
  const bad = structuredClone(i);
  bad.profile.pins[0].x += 0.001;
  bad.sequenceHash = await hash(sequencePayload(bad));
  await expect(validateInstruction(bad)).rejects.toThrow(
    "coordinates disagree",
  );
  const swapped = structuredClone(i);
  swapped.profile.pinLayout!.phaseDegreesClockwise = 0;
  swapped.sequenceHash = await hash(sequencePayload(swapped));
  await expect(validateInstruction(swapped)).rejects.toThrow(
    "coordinates disagree",
  );
  const noMetadata = structuredClone(i);
  delete noMetadata.profile.pinLayout;
  expect(await hash(sequencePayload(noMetadata))).not.toBe(i.sequenceHash);
});
