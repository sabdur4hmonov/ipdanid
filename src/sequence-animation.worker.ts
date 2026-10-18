import { validateInstruction } from "./core/validation";
import { referenceRaster } from "./core/classic-reference";
import { renderInstruction } from "./core/render";
import { animationSteps, animationThumbnail } from "./core/sequence-animation";
import type { Instruction } from "./core/types";
let guide: Instruction | undefined,
  steps: number[] = [],
  next = 0,
  state: { pixels: Float32Array; completed: number } | undefined;
let width = 1000,
  height = 1000;
let gif = false;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      if (guide) throw Error("animation/state");
      if (!["video", "gif"].includes(data.mode)) throw Error("animation/state");
      gif = data.mode === "gif";
      guide = await validateInstruction(data.guide);
      steps = animationSteps(guide.metrics.lines);
      if (
        ![
          "classic-greedy/2",
          "classic-greedy/3",
          "standard-accent/21",
        ].includes(guide.algorithm)
      ) {
        const aspect = guide.profile.widthMm / guide.profile.heightMm;
        width = Math.round(1000 * Math.min(1, aspect));
        height = Math.round(1000 * Math.min(1, 1 / aspect));
      }
      const scale = Math.min(320 / width, 320 / height, 1);
      self.postMessage({
        type: "ready",
        width,
        height,
        steps,
        thumbnailWidth: Math.max(1, Math.round(width * scale)),
        thumbnailHeight: Math.max(1, Math.round(height * scale)),
      });
      return;
    }
    if (
      !guide ||
      data.type !== "frame" ||
      data.index !== next ||
      next >= steps.length
    )
      throw Error("animation/state");
    const completed = steps[next];
    let rgba: Uint8ClampedArray;
    if (
      ["classic-greedy/2", "classic-greedy/3", "standard-accent/21"].includes(
        guide.algorithm,
      )
    ) {
      const pixels = referenceRaster(guide, 1000, completed, state);
      state = { pixels, completed };
      rgba = new Uint8ClampedArray(width * height * 4);
      for (let k = 0; k < width * height; k++) {
        for (let c = 0; c < 3; c++)
          rgba[k * 4 + c] = Math.round(pixels[k * 3 + c] * 255);
        rgba[k * 4 + 3] = 255;
      }
    } else {
      const surface = new OffscreenCanvas(width, height),
        ctx = surface.getContext("2d")!;
      renderInstruction(ctx, guide, {
        completed,
        surface: () => new OffscreenCanvas(1, 1),
      });
      rgba = ctx.getImageData(0, 0, width, height).data;
    }
    const thumbnail = gif
      ? animationThumbnail(rgba, width, height).rgba
      : undefined;
    self.postMessage(
      { type: "frame", index: next++, completed, rgba, thumbnail },
      {
        transfer: [
          rgba.buffer as ArrayBuffer,
          ...(thumbnail ? [thumbnail.buffer as ArrayBuffer] : []),
        ],
      },
    );
  } catch {
    self.postMessage({ type: "error" });
  }
};
