import { it, expect } from "vitest";
import { runInNewContext } from "node:vm";
import { offlineShellSource } from "../src/core/offline-shell";
it("serves the new online HTML, retains true offline fallback and bypasses customer API/other origins", async () => {
  const handlers: Record<string, (e: any) => void> = {},
    old = { ok: true, body: "old complete build" },
    fresh = { ok: true, body: "new complete build" };
  let network = true,
    calls = 0;
  runInNewContext(offlineShellSource("actual-test", ["/"]), {
    URL,
    self: {
      location: { origin: "http://127.0.0.1:4173" },
      addEventListener: (name: string, fn: any) => (handlers[name] = fn),
    },
    caches: { open: async () => ({ match: async () => old }) },
    fetch: async () => {
      calls++;
      if (!network) throw Error("Offline");
      return fresh;
    },
  });
  const request = (url: string, mode = "navigate") => {
    let response: Promise<any> | undefined;
    handlers.fetch({
      request: { url, mode, method: "GET" },
      respondWith: (p: Promise<any>) => (response = p),
    });
    return response;
  };
  expect(await request("http://127.0.0.1:4173/")).toBe(fresh);
  network = false;
  expect(await request("http://127.0.0.1:4173/")).toBe(old);
  const before = calls;
  expect(
    await request("http://127.0.0.1:4173/assets/versioned.js", "cors"),
  ).toBe(old);
  expect(calls).toBe(before);
  expect(request("http://127.0.0.1:4173/api/customer")).toBeUndefined();
  expect(request("https://unrelated.example/")).toBeUndefined();
});
