import { generate } from "./engine";
self.onmessage = async ({ data }) => {
  try {
    const instruction = await generate({
      ...data,
      onProgress: (fraction: number) =>
        self.postMessage({ type: "progress", fraction }),
    });
    self.postMessage({ type: "done", instruction });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Generation failed",
    });
  }
};
