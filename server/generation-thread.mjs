// Plain-JS worker bootstrap, supported by the installed pinned tsx API.
import { parentPort, workerData } from "node:worker_threads";
import { tsImport } from "tsx/esm/api";
try {
  const { generateProtected } = await tsImport(
    "./generation-work.ts",
    import.meta.url,
  );
  const result = await generateProtected(workerData, (fraction) =>
    parentPort.postMessage({ type: "progress", fraction }),
  );
  parentPort.postMessage({ type: "done", ...result }, [result.png.buffer]);
} catch (error) {
  if (process.env.IP_RASM_TEST_SERVER === "1")
    console.error(
      JSON.stringify({
        diagnostic: "generation-worker",
        name: error?.name,
        frames: String(error?.stack ?? "")
          .split("\n")
          .slice(1)
          .filter((s) => /^\s+at\s/.test(s))
          .slice(0, 4),
      }),
    );
  parentPort.postMessage({ type: "error" });
}
