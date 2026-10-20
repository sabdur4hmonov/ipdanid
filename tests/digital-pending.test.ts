import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  native: true,
  values: new Map<string, string>(),
  delay: undefined as undefined | (() => Promise<void>),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocked.native },
  CapacitorHttp: {
    request: async () => ({ status: 200, data: { loggedOut: true } }),
  },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: mocked.values.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      if (key.includes(":digital-pending:") && mocked.delay)
        await mocked.delay();
      mocked.values.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      mocked.values.delete(key);
    },
  },
}));
beforeEach(() => {
  vi.resetModules();
  mocked.values.clear();
  mocked.native = true;
  mocked.delay = undefined;
  vi.stubEnv("VITE_NATIVE_API_BASE", "https://configured-test.example/api");
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mocked.values.get(key) ?? null,
    setItem: (key: string, value: string) => mocked.values.set(key, value),
    removeItem: (key: string) => mocked.values.delete(key),
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const attempt = () => ({
  version: "digital-attempt/1" as const,
  createdAt: Date.now(),
  display: { name: "Original gift", credits: 3 },
  body: {
    productId: "gift-kit",
    kind: "gift" as const,
    name: "Synthetic buyer",
    locale: "en" as const,
    requestKey: "12345678-1234-1234-1234-123456789abc",
    quote: {
      productRevision: 3,
      settingsRevision: 2,
      currency: "UZS" as const,
      totalMinor: 10000,
    },
  },
});
it("native original digital draft survives restart but a late save cannot resurrect it after logout", async () => {
  const { customerApi: api } = await import("../src/customer-api"),
    pending = await import("../src/digital-pending");
  await api.retain({ id: "old-owner", token: "old-token" });
  const value = attempt();
  await pending.saveDigitalPending(value, "old-token");
  expect((await pending.readDigitalPending())?.body).toEqual(value.body);
  let entered!: () => void, release!: () => void;
  const arrived = new Promise<void>((r) => (entered = r)),
    hold = new Promise<void>((r) => (release = r));
  mocked.delay = async () => {
    entered();
    await hold;
  };
  const saved = pending.saveDigitalPending(value, "old-token").then(
    () => false,
    () => true,
  );
  await arrived;
  const loggingOut = api.logout();
  release();
  expect(await saved).toBe(true);
  await loggingOut;
  expect(
    [...mocked.values.keys()].some((k) => k.includes(":digital-pending:")),
  ).toBe(false);
  expect(api.session).toBeNull();
  await api.retain({ id: "new-owner", token: "new-token" });
  await expect(
    pending.saveDigitalPending(value, "old-token"),
  ).rejects.toThrow();
  expect(await pending.readDigitalPending()).toBeNull();
});
it("browser recovery is account-scoped and stale credentials cannot erase another account draft", async () => {
  mocked.native = false;
  const { customerApi: api } = await import("../src/customer-api"),
    pending = await import("../src/digital-pending");
  await api.retain({ id: "first", token: "first-token" });
  await pending.saveDigitalPending(attempt(), "first-token");
  await api.retain({ id: "second", token: "second-token" });
  expect(await pending.readDigitalPending()).toBeNull();
  const second = {
    ...attempt(),
    display: { name: "Second account gift", credits: 3 },
  };
  await pending.saveDigitalPending(second, "second-token");
  await expect(
    pending.saveDigitalPending(null, "first-token"),
  ).rejects.toThrow();
  expect((await pending.readDigitalPending())?.display.name).toBe(
    "Second account gift",
  );
});
