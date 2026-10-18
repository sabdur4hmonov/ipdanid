import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  native: false,
  mode: "fcm",
  permission: "granted",
  initialize: vi.fn(),
  revoke: vi.fn(),
  request: vi.fn(),
  token: vi.fn(async (_?: unknown) => ({ token: "fake-sdk-token" })),
  remove: vi.fn(),
  listener: vi.fn(async (_: unknown, __: unknown) => ({ remove: vi.fn() })),
  channel: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => m.native, getPlatform: () => "android" },
  registerPlugin: () => ({ revoke: m.revoke }),
}));
vi.mock("../src/customer-api", () => ({ customerApi: { request: m.request } }));
vi.mock("firebase/app", () => ({
  initializeApp: m.initialize,
  getApps: () => [],
}));
vi.mock("@capacitor-firebase/messaging", () => ({
  FirebaseMessaging: {
    isSupported: async () => ({ isSupported: true }),
    checkPermissions: async () => ({ receive: m.permission }),
    requestPermissions: async () => ({ receive: m.permission }),
    getToken: m.token,
    deleteToken: m.remove,
    createChannel: m.channel,
    addListener: m.listener,
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.native = false;
  m.permission = "granted";
  m.request.mockResolvedValue({
    mode: "fcm",
    enabled: true,
    web: {
      apiKey: "public-key",
      appId: "public-app",
      projectId: "unit-project",
      messagingSenderId: "unit-sender",
      vapidKey: "public-vapid",
    },
  });
  vi.stubGlobal("window", { isSecureContext: true });
  vi.stubGlobal("navigator", {
    serviceWorker: { ready: Promise.resolve({ scope: "https://app.test/" }) },
  });
});
afterEach(() => vi.unstubAllGlobals());
it("web SDK uses the existing offline worker, public VAPID key, permission and token deletion", async () => {
  const { createPushDriver } = await import("../src/push-driver"),
    d = await createPushDriver();
  expect(m.initialize).toHaveBeenCalledOnce();
  expect(await d.permission()).toBe(true);
  expect(await d.token()).toBe("fake-sdk-token");
  expect(m.token).toHaveBeenCalledWith({
    vapidKey: "public-vapid",
    serviceWorkerRegistration: { scope: "https://app.test/" },
  });
  await d.removeToken();
  expect(m.remove).toHaveBeenCalledOnce();
  const stop = await d.listen(
    () => {},
    () => {},
  );
  expect(m.listener).toHaveBeenCalledTimes(1);
  await stop();
});
it("native SDK creates the channel and uses privacy bridge to stop auto-init and await token deletion", async () => {
  m.native = true;
  const { createPushDriver } = await import("../src/push-driver"),
    d = await createPushDriver();
  expect(d.platform).toBe("android");
  expect(m.initialize).not.toHaveBeenCalled();
  expect(m.channel).toHaveBeenCalledWith(
    expect.objectContaining({ id: "iprasm-news" }),
  );
  await d.listen(
    () => {},
    () => {},
  );
  expect(m.listener).toHaveBeenCalledTimes(3);
  await d.removeToken();
  expect(m.revoke).toHaveBeenCalledOnce();
  expect(m.remove).not.toHaveBeenCalled();
});
it("disabled/mock config never initializes Firebase; revoked permission never requests a new token", async () => {
  const { createPushDriver } = await import("../src/push-driver");
  m.request.mockResolvedValueOnce({ mode: "mock", enabled: true, web: null });
  await expect(createPushDriver()).rejects.toThrow("unconfigured");
  expect(m.initialize).not.toHaveBeenCalled();
  const d = await createPushDriver();
  m.permission = "denied";
  await expect(d.token()).rejects.toThrow("permission");
  expect(m.token).not.toHaveBeenCalled();
});
