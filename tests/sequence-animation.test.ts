import { it, expect, vi, afterEach } from "vitest";
import {
  videoMime,
  exportSequenceAnimation,
} from "../src/sequence-animation-export";
afterEach(() => vi.unstubAllGlobals());
it("offers a truthful fallback without either recorder API and releases the one-job slot after pre-cancel", async () => {
  vi.stubGlobal("MediaRecorder", undefined);
  expect(videoMime()).toBeUndefined();
  vi.stubGlobal("MediaRecorder", class {});
  expect(videoMime()).toBeUndefined();
  const controller = new AbortController();
  controller.abort();
  for (let n = 0; n < 2; n++)
    await expect(
      exportSequenceAnimation(
        {} as any,
        {} as any,
        "gif",
        controller.signal,
        () => {},
      ),
    ).rejects.toThrow("Cancelled");
});
import {
  animationSteps,
  SequenceGif,
  animationThumbnail,
} from "../src/core/sequence-animation";
import { mkdirSync, writeFileSync } from "node:fs";
it("area-averages the real raster deterministically instead of relying on canvas backend filtering", () => {
  const source = Uint8ClampedArray.from({ length: 640 * 320 * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : Math.floor(i / 4) % 2 ? 100 : 200,
    ),
    result = animationThumbnail(source, 640, 320);
  expect(result.width).toBe(320);
  expect(result.height).toBe(160);
  for (let p = 0; p < result.rgba.length; p += 4) {
    expect(result.rgba[p]).toBe(150);
    expect(result.rgba[p + 3]).toBe(255);
  }
  expect(() =>
    animationThumbnail(new Uint8ClampedArray(4), 1000, 1000),
  ).toThrow("bounds");
});
it("preserves arbitrary grayscale literals across LZW clears and multiple changing frames", async () => {
  const gif = new SequenceGif(320, 320, true);
  let last: Uint8ClampedArray;
  for (let frame = 0; frame < 3; frame++) {
    last = Uint8ClampedArray.from({ length: 320 * 320 * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : (Math.floor(i / 4) * 41 + frame * 73) % 256,
    );
    gif.add(last, 10);
  }
  mkdirSync("output/current-animation/unit", { recursive: true });
  writeFileSync(
    "output/current-animation/unit/gradient.gif",
    new Uint8Array(await gif.finish().arrayBuffer()),
  );
  writeFileSync("output/current-animation/unit/gradient-last.rgba", last!);
  expect(last!.length).toBe(409600);
});
it("bounds frame budgets and includes exactly ordered prefixes from blank to every final strand", () => {
  for (const total of [1, 2, 37, 3000, 20000]) {
    const steps = animationSteps(total);
    expect(steps[0]).toBe(0);
    expect(steps.at(-1)).toBe(total);
    expect(steps.length).toBeLessThanOrEqual(61);
    expect(new Set(steps).size).toBe(steps.length);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  }
  for (const invalid of [0, -1, 2.2, 20001, NaN, Infinity])
    expect(() => animationSteps(invalid)).toThrow("bounds");
});
it("writes bounded real GIF89a frames with a global palette, timed sequence and trailer", async () => {
  const encoder = new SequenceGif(32, 32, true);
  for (const shade of [255, 128, 0])
    encoder.add(
      Uint8ClampedArray.from({ length: 32 * 32 * 4 }, (_, i) =>
        i % 4 === 3 ? 255 : shade,
      ),
      20,
    );
  const blob = encoder.finish(),
    bytes = new Uint8Array(await blob.arrayBuffer());
  expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe("GIF89a");
  expect(bytes.at(-1)).toBe(59);
  expect(blob.type).toBe("image/gif");
  mkdirSync("output/current-animation/unit", { recursive: true });
  writeFileSync("output/current-animation/unit/gray.gif", bytes);
  const color = new SequenceGif(32, 32, false);
  color.add(
    Uint8ClampedArray.from({ length: 32 * 32 * 4 }, (_, i) =>
      i % 4 === 0 || i % 4 === 3 ? 255 : 0,
    ),
    20,
  );
  writeFileSync(
    "output/current-animation/unit/red.gif",
    new Uint8Array(await color.finish().arrayBuffer()),
  );
  expect(() => new SequenceGif(321, 1, true)).toThrow("bounds");
  expect(() => new SequenceGif(1, 1, true).finish()).toThrow("empty");
  expect(() =>
    new SequenceGif(1, 1, true).add(new Uint8ClampedArray(4), 0),
  ).toThrow("bounds");
  const limited = new SequenceGif(1, 1, true);
  for (let k = 0; k < 61; k++) limited.add(new Uint8ClampedArray(4), 1);
  expect(() => limited.add(new Uint8ClampedArray(4), 1)).toThrow("bounds");
});
