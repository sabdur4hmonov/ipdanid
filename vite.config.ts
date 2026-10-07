import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { offlineShellSource } from "./src/core/offline-shell";
export default defineConfig({
  // Native build caches and private evidence are served on demand, never source watched.
  server: {
    watch: {
      ignored: ["**/tmp/**", "**/output/**", "**/android/**", "**/ios/**"],
    },
  },
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
          ...Object.keys(bundle)
            .filter((f) => !f.endsWith(".map"))
            .map((f) => "/" + f),
        ];
        const version = Object.keys(bundle).sort().join("|");
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
