import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { localCraftStore } from "../src/local-craft-store";
import { makeQrCraft, validateQrCraft } from "../src/core/qr-craft";
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));
const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  vi.stubGlobal("navigator", {});
});
afterEach(() => vi.unstubAllGlobals());
it("durably resumes the exact guide, serializes writes and refuses stale confirmations/deletes", async () => {
  const store = localCraftStore(
      "test-qr",
      validateQrCraft,
      (g) => g.moves.length,
    ),
    guide = await makeQrCraft("LOCAL ONLY"),
    p = {
      id: crypto.randomUUID(),
      name: "QR",
      guide,
      confirmed: 0,
      revision: 0,
    };
  await store.save(p);
  const fresh = localCraftStore(
    "test-qr",
    validateQrCraft,
    (g) => g.moves.length,
  );
  expect(await fresh.read()).toEqual([p]);
  const next = { ...p, confirmed: 1, revision: 1 },
    stale = { ...p, confirmed: 2, revision: 1 };
  const results = await Promise.allSettled([
    store.save(next, 0),
    fresh.save(stale, 0),
  ]);
  expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
  await expect(fresh.remove(p.id, 0)).rejects.toThrow("craft/conflict");
  expect((await fresh.read())[0].confirmed).toBe(1);
  await fresh.remove(p.id, 1);
  expect(await fresh.read()).toEqual([]);
  await expect(store.save({ ...next, revision: 2 }, 1)).rejects.toThrow(
    "craft/conflict",
  );
});
it("rejects malformed/oversize libraries, invalid progress and edited guide geometry before persisting", async () => {
  const store = localCraftStore(
      "test-qr",
      validateQrCraft,
      (g) => g.moves.length,
    ),
    guide = await makeQrCraft("SAFE"),
    p = {
      id: crypto.randomUUID(),
      name: "QR",
      guide,
      confirmed: 0,
      revision: 0,
    };
  await expect(
    store.save({ ...p, confirmed: guide.moves.length + 1 }),
  ).rejects.toThrow("craft/storage");
  const forged = structuredClone(p);
  forged.guide.holes[0].x++;
  await expect(store.save(forged)).rejects.toThrow("qr/provenance");
  expect(await store.read()).toEqual([]);
  for (let i = 0; i < 5; i++)
    await store.save({ ...p, id: crypto.randomUUID() });
  await expect(store.save(p)).rejects.toThrow("craft/limit");
  values.set("iprasm.craft.test-qr.v1", "x".repeat(8_000_001));
  await expect(store.read()).rejects.toThrow("craft/storage");
});
