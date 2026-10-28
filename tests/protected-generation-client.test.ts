import { test, expect, vi, afterEach } from "vitest";
import {
  generationAttempt,
  runProtectedGeneration,
  type GenerationAttempt,
  resolveProtectedGenerationMode,
} from "../src/protected-generation";
import { customerApi } from "../src/customer-api";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
afterEach(() => vi.restoreAllMocks());
test("invalid build-mode settings fail closed rather than silently enabling the local fitter", () => {
  for (const value of [undefined, "", "0"])
    expect(resolveProtectedGenerationMode(value)).toBe(false);
  expect(resolveProtectedGenerationMode("1")).toBe(true);
  for (const value of ["true", "false", "yes", 1, null])
    expect(() => resolveProtectedGenerationMode(value)).toThrow(
      "configuration",
    );
});
async function attempt() {
  return generationAttempt({
    pixels: new Uint8Array(750000).fill(190),
    shape: "circle",
    revision: 1,
    lines: 2500,
    preparation: {
      version: "standard-preparation/9",
      sourceHash: "a".repeat(64),
      sourceAspect: 1,
      whiteBackground: "original",
      transform: frameFreePhoto("object", [], "circle", 1),
    },
  });
}
const config = {
    version: "protected-generation/1",
    consent: "prepared-target-transfer/1",
    enabled: true,
  },
  jobId = "12345678-1234-1234-1234-123456789abc";
function ready(a: GenerationAttempt) {
  const png = Buffer.alloc(48);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.writeUInt32BE(1000, 16);
  png.writeUInt32BE(1000, 20);
  return {
    id: jobId,
    status: "ready",
    fraction: 1,
    expiresAt: Date.now() + 60000,
    sequenceHash: "a".repeat(64),
    lines: a.body.lines,
    width: 1000,
    height: 1000,
    preview: png.toString("base64"),
  };
}
test("same prepared input retains exact uncertain-request identity; changed input gets a new random capability", async () => {
  const a = await attempt(),
    preparation = a.body.preparation as any,
    input = {
      pixels: new Uint8Array(750000).fill(190),
      shape: "circle" as const,
      revision: 1,
      lines: 2500,
      preparation,
    };
  expect(await generationAttempt(input, a)).toBe(a);
  expect(Buffer.from(String(a.body.secret), "base64url")).toHaveLength(32);
  expect(Buffer.from(String(a.body.target), "base64url")).toHaveLength(250000);
  const changed = await generationAttempt({ ...input, lines: 3000 }, a);
  expect(changed.body.secret === a.body.secret).toBe(false);
  expect(changed.body.requestKey === a.body.requestKey).toBe(false);
  expect(JSON.stringify(a.body).includes("segments")).toBe(false);
});
test("the reviewed coordinate snapshot is forwarded without regeneration and bound into retry identity", async () => {
  const a = await attempt(),
    coordinates = standardProfiles(DEFAULT_STANDARD_KIT)[0].pins.map(
      (p) => [p.x, p.y] as [number, number],
    ),
    input = {
      pixels: new Uint8Array(750000).fill(190),
      shape: "circle" as const,
      revision: 1,
      lines: 2500,
      preparation: a.body.preparation as any,
      pins: { version: "kit-pin-snapshot/1" as const, coordinates },
    };
  const b = await generationAttempt(input);
  expect(b.body.pins).toEqual(input.pins);
  const changed = structuredClone(input);
  changed.pins.coordinates[21][1] += Number.EPSILON;
  const c = await generationAttempt(changed, b);
  expect(c.fingerprint).not.toBe(b.fingerprint);
});
test("configured-off server fails closed before sending a target; no local fitter fallback", async () => {
  const a = await attempt(),
    request = vi
      .spyOn(customerApi, "request")
      .mockResolvedValue({ ...config, enabled: false });
  await expect(
    runProtectedGeneration(a, {
      cancelled: () => false,
      onJob: vi.fn(),
      onProgress: vi.fn(),
    }),
  ).rejects.toThrow("generation/unavailable");
  expect(request.mock.calls.map((c) => c[0])).toEqual(["/generation/config"]);
});
test("static-only result returns capability in memory, never URL or default account credentials", async () => {
  const a = await attempt(),
    progress = vi.fn(),
    onJob = vi.fn(),
    request = vi
      .spyOn(customerApi, "request")
      .mockImplementation((async (path: string) =>
        path === "/generation/config"
          ? config
          : path === "/generation/start"
            ? { id: jobId }
            : ready(a)) as any);
  const result = await runProtectedGeneration(a, {
    cancelled: () => false,
    onJob,
    onProgress: progress,
  });
  expect(result.kind).toBe("protected-generation");
  expect(result.sequenceHash).toBe("a".repeat(64));
  expect("instruction" in result || "segments" in result).toBe(false);
  expect(onJob).toHaveBeenCalledTimes(1);
  expect(progress).toHaveBeenLastCalledWith(1);
  expect(
    request.mock.calls.every((c) => !c[0].includes("?") && c[2] === ""),
  ).toBe(true);
});
test("late start after navigation is cancelled and never reaches progress/result callbacks", async () => {
  const a = await attempt();
  let cancelled = false;
  let release!: (v: unknown) => void;
  const start = new Promise((resolve) => {
    release = resolve;
  });
  const request = vi
      .spyOn(customerApi, "request")
      .mockImplementation((async (path: string) =>
        path === "/generation/config"
          ? config
          : path === "/generation/start"
            ? start
            : {}) as any),
    onJob = vi.fn(),
    onProgress = vi.fn(),
    result = runProtectedGeneration(a, {
      cancelled: () => cancelled,
      onJob,
      onProgress,
    });
  // Allow config/cancellation checks to reach the in-flight start.
  await vi.waitFor(() =>
    expect(request.mock.calls.some((c) => c[0] === "/generation/start")).toBe(
      true,
    ),
  );
  cancelled = true;
  release({ id: jobId });
  await expect(result).rejects.toThrow("Cancelled");
  expect(onJob).not.toHaveBeenCalled();
  expect(onProgress).not.toHaveBeenCalled();
  expect(request.mock.calls.some((c) => c[0] === "/generation/cancel")).toBe(
    true,
  );
});
test("server route disclosure, malformed preview and terminal status cannot become a customer result", async () => {
  const a = await attempt();
  for (const change of [
    { steps: [1, 2] },
    { status: "failed" },
    { preview: "data:text/html,unsafe" },
    { expiresAt: 1 },
    { lines: 3500 },
  ]) {
    vi.spyOn(customerApi, "request").mockImplementation((async (
      path: string,
    ) =>
      path === "/generation/config"
        ? config
        : path === "/generation/start"
          ? { id: jobId }
          : { ...ready(a), ...change }) as any);
    await expect(
      runProtectedGeneration(a, {
        cancelled: () => false,
        onJob: vi.fn(),
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow("generation/unavailable");
    vi.restoreAllMocks();
  }
});
