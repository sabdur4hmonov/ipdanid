import { generate } from "./engine";
import { generateDensity } from "./density";
self.onmessage = async ({ data }) => {
  try {
    const started = performance.now();
    const options = {
      ...data,
      onProgress: (fraction: number) =>
        self.postMessage({ type: "progress", fraction }),
    };
    let baseline;
    if (data.strategy === "global" && !data.seed) {
      baseline = await generate({
        ...options,
        lines: Math.max(
          1,
          data.lines -
            Math.min(
              data.profile.pins.length * 2,
              Math.floor(data.lines * 0.25),
            ),
        ),
        onProgress: (fraction: number) => options.onProgress(fraction * 0.5),
      });
      options.seed = baseline;
      options.onProgress = (fraction: number) =>
        self.postMessage({ type: "progress", fraction: 0.5 + fraction * 0.5 });
    }
    const instruction = await (
      data.strategy === "global" ? generateDensity : generate
    )(options);
    self.postMessage({
      type: "done",
      instruction,
      baseline,
      durationMs: performance.now() - started,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Generation failed",
    });
  }
};
