import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
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
          source: `const CACHE='iprasm-'+${JSON.stringify(version)}; const FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iprasm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;e.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname,{ignoreVary:true})).then(r=>r||fetch(e.request)));});`,
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
