import { it, expect, vi, afterEach } from "vitest";
import { KitStore } from "../server/kit-store";
import { buildAccess, verifyBuildReceipt } from "../src/build-access";
import { customerApi, customerCacheNamespace } from "../src/customer-api";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import { validateInstruction } from "../src/core/validation";
const stores: KitStore[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  customerApi.session = null;
  stores.splice(0).forEach((s) => s.close());
});
const device = "device-client-0123456789",
  sequenceHash = "a".repeat(64);
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  const c = s.issueKitBatch("admin", "board", 1, "batch-client"),
    a = s.loginKit(c.codes[0].code);
  return { s, a };
}
it("forever receipt verifies actual Ed25519 and rejects every account/device/sequence/key/payload/signature substitution", async () => {
  const { s, a } = setup(),
    r = s.unlockBuild(a.id, sequenceHash, device, "unlock-client"),
    expected = { accountId: a.id, sequenceHash, deviceId: device };
  expect(await verifyBuildReceipt(r.receipt, r.publicKey, expected)).toBe(true);
  for (const field of ["accountId", "sequenceHash", "deviceId"] as const)
    expect(
      await verifyBuildReceipt(r.receipt, r.publicKey, {
        ...expected,
        [field]: "b".repeat(64),
      }),
    ).toBe(false);
  const bad = structuredClone(r.receipt);
  bad.payload.issuedAt++;
  expect(await verifyBuildReceipt(bad, r.publicKey, expected)).toBe(false);
  const extra = structuredClone(r.receipt);
  (extra.payload as any).expiresAt = 0;
  expect(await verifyBuildReceipt(extra, r.publicKey, expected)).toBe(false);
  const other = setup();
  expect(
    await verifyBuildReceipt(r.receipt, other.s.buildKey(), expected),
  ).toBe(false);
  const sig = structuredClone(r.receipt);
  sig.signature =
    (sig.signature[0] === "A" ? "B" : "A") + sig.signature.slice(1);
  expect(await verifyBuildReceipt(sig, r.publicKey, expected)).toBe(false);
});
it("client pins trusted key, retains offline access and retries lost storage writes without a second charge", async () => {
  const memory = new Map<string, string>();
  let failWrite = false;
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrite && k.endsWith(":build-access-v1")) {
        failWrite = false;
        throw Error("QuotaExceededError");
      }
      memory.set(k, v);
    },
    removeItem: (k: string) => memory.delete(k),
  });
  vi.stubGlobal("window", new EventTarget());
  const { s, a } = setup();
  await customerApi.retain({ id: a.id, token: a.token });
  let key = s.buildKey();
  vi.spyOn(customerApi, "request").mockImplementation((async (
    path: string,
    body: any,
  ) => {
    if (path === "/builds/key") return key;
    if (path === "/builds/unlock")
      return s.unlockBuild(
        a.id,
        body.sequenceHash,
        body.deviceId,
        body.requestKey,
      );
    throw Error("unexpected request");
  }) as any);
  const i = { sequenceHash, params: { accessPolicy: "kit-build/1" } } as any;
  expect(await buildAccess.allowed(i)).toBe(false);
  // First trust write succeeds, then simulate a full device during receipt persistence.
  const setter = vi.spyOn(localStorage, "setItem");
  let calls = 0;
  setter.mockImplementation((k, v) => {
    calls++;
    if (calls === 2) throw Error("QuotaExceededError");
    memory.set(k, v);
  });
  await expect(buildAccess.unlock(i)).rejects.toThrow("QuotaExceededError");
  expect(s.kitBalance(a.id)).toBe(2);
  expect(await buildAccess.allowed(i)).toBe(false);
  setter.mockImplementation((k, v) => memory.set(k, v));
  await buildAccess.unlock(i);
  expect(s.kitBalance(a.id)).toBe(2);
  expect(await buildAccess.allowed(i)).toBe(true);
  vi.mocked(customerApi.request).mockRejectedValueOnce(Error("offline"));
  expect(await buildAccess.allowed(i)).toBe(true);
  const cacheKey = customerCacheNamespace + ":build-access-v1",
    cache = JSON.parse(memory.get(cacheKey)!);
  cache.receipts[sequenceHash].payload.deviceId = "another-device-012345";
  memory.set(cacheKey, JSON.stringify(cache));
  expect(await buildAccess.allowed(i)).toBe(false);
  // An online same-account retry restores the signed receipt with no charge.
  await expect(buildAccess.unlock(i)).rejects.toThrow("offline");
  await buildAccess.unlock(i);
  expect(s.kitBalance(a.id)).toBe(2);
  expect(await buildAccess.allowed(i)).toBe(true);
  key = setup().s.buildKey();
  await expect(
    buildAccess.unlock({ ...i, sequenceHash: "b".repeat(64) }),
  ).rejects.toThrow("build-access/key");
  expect(s.kitBalance(a.id)).toBe(2);
  expect(await buildAccess.allowed(i)).toBe(true);
});
it("opt-in access policy changes only bound metadata; legacy exact guides remain valid", async () => {
  const options = {
      profile: createProfile("circle", 24),
      pixels: new Uint8Array(32 * 32 * 3).fill(170),
      resolution: 32,
      lines: 40,
      mode: "dark" as const,
    },
    old = await generate(options),
    newGuide = await generate({ ...options, accessPolicy: "kit-build/1" });
  expect(old.params.accessPolicy).toBeUndefined();
  expect(newGuide.params.accessPolicy).toBe("kit-build/1");
  expect(newGuide.segments).toEqual(old.segments);
  expect(newGuide.sequenceHash).not.toBe(old.sequenceHash);
  await validateInstruction(newGuide);
  expect(await buildAccess.allowed(old)).toBe(true);
  const stripped = structuredClone(newGuide);
  delete stripped.params.accessPolicy;
  await expect(validateInstruction(stripped)).rejects.toThrow("integrity");
  expect(await hash(sequencePayload(stripped))).toBe(old.sequenceHash);
});
it("remote release verifies the actual guide before caching; a corrupted paid response retries without another debit", async () => {
  const memory = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  });
  vi.stubGlobal("window", new EventTarget());
  const { s, a } = setup(),
    guide = await generate({
      profile: createProfile("circle", 24),
      pixels: new Uint8Array(32 * 32 * 3).fill(170),
      resolution: 32,
      lines: 40,
      mode: "dark",
      accessPolicy: "kit-build/1",
    });
  await customerApi.retain({ id: a.id, token: a.token });
  let corrupted = true;
  const request = vi.spyOn(customerApi, "request").mockImplementation((async (
    path: string,
    body: any,
  ) => {
    if (path === "/builds/key") return s.buildKey();
    if (path !== "/generation/unlock") throw Error("Unexpected remote route");
    expect(Object.keys(body).sort()).toEqual([
      "deviceId",
      "id",
      "requestKey",
      "secret",
    ]);
    const result = s.unlockBuild(
      a.id,
      guide.sequenceHash,
      body.deviceId,
      body.requestKey,
    );
    return {
      ...result,
      instruction: corrupted
        ? { ...guide, sequenceHash: "0".repeat(64) }
        : guide,
    };
  }) as any);
  const remote = {
    id: "12345678-1234-1234-1234-123456789abc",
    secret: "synthetic-capability-never-a-real-code",
  };
  await expect(buildAccess.unlock(guide, remote)).rejects.toThrow();
  expect(await buildAccess.allowed(guide)).toBe(false);
  expect(s.kitBalance(a.id)).toBe(2);
  corrupted = false;
  const retry = await buildAccess.unlock(guide, remote);
  expect(retry.duplicate).toBe(true);
  expect(retry.instruction?.sequenceHash).toBe(guide.sequenceHash);
  expect(s.kitBalance(a.id)).toBe(2);
  expect(await buildAccess.allowed(guide)).toBe(true);
  expect(request.mock.calls.some((c) => c[0] === "/builds/unlock")).toBe(false);
  const second = structuredClone(guide);
  second.imageHash = "b".repeat(64);
  second.sequenceHash = await hash(sequencePayload(second));
  const other = setup().a;
  request.mockImplementation((async (path: string, body: any) => {
    if (path === "/builds/key") return s.buildKey();
    const result = s.unlockBuild(
      a.id,
      second.sequenceHash,
      body.deviceId,
      body.requestKey,
    );
    await customerApi.retain({ id: other.id, token: other.token });
    return { ...result, instruction: second };
  }) as any);
  await expect(buildAccess.unlock(second, remote)).rejects.toThrow("signature");
  expect(await buildAccess.allowed(second)).toBe(false);
  expect(s.kitBalance(a.id)).toBe(1);
  request.mockRejectedValue(Error("offline"));
  expect(await buildAccess.allowed(guide)).toBe(true);
});
