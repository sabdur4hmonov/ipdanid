import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  native: true,
  values: new Map<string, string>(),
  request: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocked.native },
  CapacitorHttp: { request: mocked.request },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: mocked.values.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      mocked.values.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      mocked.values.delete(key);
    },
  },
}));
beforeEach(() => {
  vi.resetModules();
  mocked.native = true;
  mocked.values.clear();
  mocked.request.mockReset();
  vi.stubEnv("VITE_NATIVE_API_BASE", "https://configured-test.example/api");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("native recovery retains only the replacement identity; its one-time key never enters preferences", async () => {
  mocked.request.mockResolvedValue({
    status: 200,
    data: {
      id: "new-owner",
      token: "new-token",
      email: "owner@example.com",
      recoveryKey: "one-time-private-key",
    },
  });
  const { CustomerApi } = await import("../src/customer-api"),
    api = new CustomerApi();
  await api.retain({ id: "old-owner", token: "old-token" });
  const result = await api.authenticate("recover", {
    email: "owner@example.com",
    recoveryKey: "prior-key",
    password: "replacement password",
  });
  expect(result.recoveryKey).toBe("one-time-private-key");
  const restored = new CustomerApi();
  await restored.restore();
  expect(restored.session).toEqual({
    id: "new-owner",
    token: "new-token",
    email: "owner@example.com",
  });
  expect([...mocked.values.values()].join()).not.toContain(
    "one-time-private-key",
  );
  expect([...mocked.values.values()].join()).not.toContain("old-token");
});
it("native offline sign out clears credentials even when remote revocation cannot be confirmed", async () => {
  mocked.request.mockRejectedValue(new Error("connection unavailable"));
  const { CustomerApi, ApiError } = await import("../src/customer-api"),
    api = new CustomerApi();
  await api.retain({ id: "owner", token: "private-session" });
  await expect(api.logout()).rejects.toBeInstanceOf(ApiError);
  expect(api.session).toBeNull();
  expect(mocked.values.size).toBe(0);
  const restored = new CustomerApi();
  await restored.restore();
  expect(restored.session).toBeNull();
});
it("native unauthorized and redirect responses cannot be mistaken for a successful account", async () => {
  const { CustomerApi, ApiError } = await import("../src/customer-api"),
    api = new CustomerApi();
  await api.retain({ id: "owner", token: "private-session" });
  mocked.request.mockResolvedValue({ status: 401, data: { error: "expired" } });
  await expect(api.request("/account")).rejects.toMatchObject({ status: 401 });
  mocked.request.mockResolvedValue({ status: 302, data: {} });
  await expect(api.request("/account")).rejects.toBeInstanceOf(ApiError);
  expect(mocked.request.mock.calls.at(-1)![0]).toMatchObject({
    url: "https://configured-test.example/api/account",
    disableRedirects: true,
  });
});
it("unconfigured native commerce never silently calls loopback; local stored identity remains readable", async () => {
  vi.stubEnv("VITE_NATIVE_API_BASE", "");
  const { CustomerApi } = await import("../src/customer-api"),
    api = new CustomerApi();
  await api.retain({ id: "local-owner", token: "local-token" });
  const restored = new CustomerApi();
  await restored.restore();
  expect(restored.session?.id).toBe("local-owner");
  await expect(api.request("/account")).rejects.toMatchObject({ status: 503 });
  expect(mocked.request).not.toHaveBeenCalled();
});
it("expired browser sign out clears local credentials and malformed saved sessions do not crash local artwork", async () => {
  mocked.native = false;
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "expired" }),
    }),
  );
  const { CustomerApi } = await import("../src/customer-api"),
    api = new CustomerApi();
  await api.retain({ id: "owner", token: "expired-token" });
  await api.logout();
  expect(values.size).toBe(0);
  values.set("iprasm.customer.product-4311.v1", "{broken-json");
  const restored = new CustomerApi();
  await restored.restore();
  expect(restored.session).toBeNull();
});
