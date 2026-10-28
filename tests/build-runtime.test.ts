import { test, expect } from "vitest";
import config from "../vite.config";
test("build runtime contract binds actual resolved flags, fails closed and emits only public whitelisted fields", () => {
  const plugin = (config as any).plugins.find(
    (p: any) => p.name === "public-build-runtime-contract",
  );
  let output: any;
  plugin.configResolved({
    env: {
      VITE_SERVER_GENERATION: "1",
      VITE_NATIVE_API_BASE: "http://127.0.0.1:4657/api",
      ADMIN_SECRET: "never-export-this",
    },
  });
  plugin.generateBundle.call({ emitFile: (value: any) => (output = value) });
  expect(output.fileName).toBe("build-runtime.json");
  expect(JSON.parse(output.source)).toEqual({
    version: "iprasm.build-runtime/1",
    protectedGeneration: true,
    nativeApiBase: "http://127.0.0.1:4657/api",
  });
  expect(output.source).not.toContain("never-export-this");
  expect(() =>
    plugin.configResolved({ env: { VITE_SERVER_GENERATION: "typo" } }),
  ).toThrow();
  plugin.configResolved({
    env: {
      VITE_SERVER_GENERATION: "0",
      VITE_NATIVE_API_BASE: "https://user:secret@example.invalid/api",
    },
  });
  plugin.generateBundle.call({ emitFile: (value: any) => (output = value) });
  expect(JSON.parse(output.source)).toEqual({
    version: "iprasm.build-runtime/1",
    protectedGeneration: false,
    nativeApiBase: null,
  });
});
