import { chromium, expect } from "@playwright/test";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const variant = process.argv[2] ?? "distributed-contours",
  folder = process.argv[3] ?? "fidelity";
const basePath = `output/${folder}`,
  outputPrefix = ["background", "regions", "guarded"].includes(folder)
    ? `${variant}-`
    : "";
const baselineData = JSON.parse(
    readFileSync(
      folder === "guarded"
        ? `${basePath}/basis-refined.json`
        : folder === "regions"
          ? `${basePath}/${variant}-stage1.json`
          : folder === "background"
            ? `${basePath}/${variant}-stage2.json`
            : `${basePath}/baseline.json`,
      "utf8",
    ),
  ),
  expected = JSON.parse(
    readFileSync(`${basePath}/${variant}.json`, "utf8"),
  ).instruction,
  pixels = [
    ...readFileSync(
      folder === "background"
        ? `${basePath}/${variant}-target.bin`
        : `${basePath}/target.bin`,
    ),
  ],
  workerFile = readdirSync("dist/assets").find((n) =>
    n.startsWith("generator.worker-"),
  );
const baseline = baselineData.instruction ?? baselineData;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.exposeFunction("workerProgress", (p) =>
    console.log(`Worker ${Math.round(p * 100)}%`),
  );
  // All scripts were precached by the production app shell. No photograph leaves loopback.
  await page.context().setOffline(true);
  const started = Date.now(),
    data = await page.evaluate(
      async ({ baseline, pixels, workerFile, strategy }) => {
        const bytes = new Uint8Array(pixels),
          digest = await crypto.subtle.digest("SHA-256", bytes),
          targetHash = [...new Uint8Array(digest)]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("");
        if (targetHash !== baseline.imageHash)
          throw new Error("Wrong processed target");
        return new Promise((resolve, reject) => {
          const w = new Worker(`/assets/${workerFile}`, { type: "module" });
          let last = -1;
          const timer = setTimeout(() => {
            w.terminate();
            reject(new Error("Worker CPU-time ceiling reached"));
          }, 300000);
          w.onerror = (e) => {
            clearTimeout(timer);
            w.terminate();
            reject(new Error(e.message));
          };
          w.onmessage = ({ data }) => {
            if (data.jobId !== 719) {
              clearTimeout(timer);
              w.terminate();
              reject(new Error("Worker job association mismatch"));
              return;
            }
            if (data.type === "progress") {
              const step = Math.floor(data.fraction * 10);
              if (last !== step) {
                last = step;
                window.workerProgress(data.fraction);
              }
            } else {
              clearTimeout(timer);
              w.terminate();
              data.type === "done"
                ? resolve({ ...data, targetHash, offline: true })
                : reject(new Error(data.message));
            }
          };
          w.postMessage({
            jobId: 719,
            pixels: bytes,
            resolution: baseline.params.resolution,
            profile: baseline.profile,
            lines: baseline.params.requestedLines,
            portrait: baseline.params.portrait,
            mode: baseline.params.mode,
            seed: baseline,
            strategy,
          });
        });
      },
      {
        baseline,
        pixels,
        workerFile,
        strategy:
          folder === "guarded"
            ? "multiscale"
            : folder === "regions"
              ? "continuous"
              : "global",
      },
    );
  expect(data.instruction.sequenceHash).toBe(expected.sequenceHash);
  expect(data.instruction.segments).toEqual(expected.segments);
  writeFileSync(
    `${basePath}/${outputPrefix}worker-result.json`,
    JSON.stringify(data, null, 2),
  );
  const evidence = {
    offline: data.offline,
    jobId: data.jobId,
    strategy:
      folder === "guarded"
        ? "multiscale"
        : folder === "regions"
          ? "continuous"
          : "global",
    workerFile,
    targetHash: data.targetHash,
    sequenceHash: data.instruction.sequenceHash,
    durationMs: Date.now() - started,
    reportedStageMs: data.durationMs,
    lines: data.instruction.metrics.lines,
    estimatedMeters: data.instruction.metrics.estimatedMeters,
    nativeDeviceTested: false,
  };
  writeFileSync(
    `${basePath}/${outputPrefix}worker-evidence.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
