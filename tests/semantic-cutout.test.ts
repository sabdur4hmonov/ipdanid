import { expect, test } from "vitest";
import { semanticCutout } from "../src/core/semantic-cutout";
const labels = [
  "background",
  "aeroplane",
  "bicycle",
  "bird",
  "boat",
  "bottle",
  "bus",
  "car",
  "cat",
  "chair",
  "cow",
  "diningtable",
  "dog",
  "horse",
  "motorbike",
  "person",
  "pottedplant",
  "sheep",
  "sofa",
  "train",
  "tv",
];
function scene() {
  const masks = labels.map(() => ({
    width: 10,
    height: 10,
    values: new Float32Array(100),
  }));
  masks[0].values.fill(1);
  const fill = (index: number, pixels: number[]) => {
    for (const k of pixels) {
      masks[0].values[k] = 0.05;
      masks[index].values[k] = 0.95;
    }
  };
  return { masks, fill };
}
test("automatic cutout retains both separated pets and does not use person probability", () => {
  const { masks, fill } = scene();
  fill(8, [11, 12, 21, 22]);
  fill(12, [66, 67, 76, 77]);
  const r = semanticCutout(labels, masks, "auto");
  expect(r.subjectKind).toBe("animal");
  expect([...r.mask.values].filter((v) => v > 0.9)).toHaveLength(8);
  expect(r.mask.values[0]).toBe(0);
  expect(() => semanticCutout(labels, masks, "people")).toThrow(
    "no-confident-subject",
  );
});
test("explicit animal selection keeps cat while excluding recognized background furniture", () => {
  const { masks, fill } = scene();
  fill(8, [11, 12, 21, 22]);
  fill(18, [60, 61, 62, 63, 64, 65]);
  const r = semanticCutout(labels, masks, "animal");
  expect(r.mask.values[11]).toBeCloseTo(0.95);
  expect(r.mask.values[60]).toBe(0);
});
test("auto does not discard a smaller subject just because another group dominates", () => {
  const { masks, fill } = scene();
  fill(15, [11, 12, 13, 14, 15, 16]);
  fill(8, [31, 32, 33, 34]);
  const r = semanticCutout(labels, masks, "auto");
  expect(r.mask.values[31]).toBeCloseTo(0.95);
  expect(r.mask.values[11]).toBeCloseTo(0.95);
  expect(r.refinePeople).toBe(false);
});
test("empty or fragmentary predictions are refused for intact-source fallback", () => {
  const { masks, fill } = scene();
  expect(() => semanticCutout(labels, masks, "auto")).toThrow();
  fill(8, [11]);
  expect(() => semanticCutout(labels, masks, "animal")).toThrow(
    "no-confident-subject",
  );
});
test("unsupported model labels and nonfinite confidence are refused", () => {
  const { masks, fill } = scene();
  fill(7, [11, 12, 21, 22]);
  expect(semanticCutout(labels, masks, "vehicle").subjectKind).toBe("vehicle");
  expect(() => semanticCutout(labels.slice(1), masks, "auto")).toThrow();
  masks[7].values[11] = NaN;
  expect(() => semanticCutout(labels, masks, "vehicle")).toThrow();
});
