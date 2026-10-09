import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { offlineShellSource } from "./src/core/offline-shell";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const segmentationFiles = [
  "vision_bundle.js",
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
  "selfie_multiclass_256x256.tflite",
  "LICENSE.txt",
  "PROVENANCE.json",
].map((f) => "/vendor/portrait-segmentation/" + f);
export default defineConfig({
  // Native build caches and private evidence are served on demand, never source watched.
  server: {
    proxy: { "/api": "http://127.0.0.1:4311" },
    watch: {
      ignored: ["**/tmp/**", "**/output/**", "**/android/**", "**/ios/**"],
    },
  },
  preview: { proxy: { "/api": "http://127.0.0.1:4311" } },
  plugins: [
    react(),
    {
      name: "offline-app-shell",
      generateBundle(_options, bundle) {
        const files = [
          "/",
          "/index.html",
          "/icon.svg",
          "/manifest.webmanifest",
          "/fonts/NotoSans-Regular.ttf",
          ...segmentationFiles,
          ...Object.keys(bundle)
            .filter((f) => !f.endsWith(".map"))
            .map((f) => "/" + f),
        ];
        const version =
          Object.keys(bundle).sort().join("|") +
          "|" +
          segmentationFiles
            .map((f) =>
              createHash("sha256")
                .update(readFileSync("public" + f))
                .digest("hex"),
            )
            .join("|");
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: offlineShellSource(version, files),
        });
      },
    },
  ],
  // Each optical test can allocate its own footprint cache; serialize to bound host usage.
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    maxWorkers: 1,
    fileParallelism: false,
  },
} as Parameters<typeof defineConfig>[0]);
