import { generate } from "./engine";
import { generateDensity } from "./density";
self.onmessage = async ({ data }) => {
  try {
    const started = performance.now();
    const options = {
      ...data,
      onProgress: (fraction: number) =>
        self.postMessage({ type: "progress", jobId: data.jobId, fraction }),
    };
    options.guarded =
      data.strategy === "guarded" || data.strategy === "multiscale";
    let baseline;
    if (["global", "multiscale"].includes(data.strategy) && !data.seed) {
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
        self.postMessage({
          type: "progress",
          jobId: data.jobId,
          fraction: 0.5 + fraction * 0.5,
        });
    }
    const instruction = ["global", "multiscale"].includes(data.strategy)
      ? await generateDensity(options, {
          edgeWeight:
            data.seed?.params.optimization?.edgeWeight ??
            (data.strategy === "multiscale" ? 2 : 1),
          sweeps: data.seed?.params.optimization?.sweeps ?? 8,
          multiscale: data.strategy === "multiscale",
        })
      : await generate(options);
    self.postMessage({
      type: "done",
      jobId: data.jobId,
      instruction,
      baseline,
      durationMs: performance.now() - started,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      jobId: data.jobId,
      message: error instanceof Error ? error.message : "Generation failed",
    });
  }
};
