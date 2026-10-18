import { expect, it, vi } from "vitest";
import { PushLifecycle, type PushDriver } from "../src/push-lifecycle";
function setup() {
  let account: string | undefined = "account-A",
    token = "first-token";
  let rotated = () => {};
  const driver: PushDriver = {
    platform: "android",
    permission: vi.fn(async () => true),
    token: vi.fn(async () => token),
    removeToken: vi.fn(async () => {}),
    listen: vi.fn(async (cb) => {
      rotated = cb;
      return vi.fn(async () => {});
    }),
  };
  const ports = {
    identity: async () => ({
      installationId: "test-id",
      installationSecret: "test-proof",
    }),
    account: () => account,
    register: vi.fn(async (_: unknown) => {}),
    revoke: vi.fn(async (_: unknown) => {}),
    driver: async () => driver,
    save: vi.fn(async (_: boolean) => {}),
    message: vi.fn(),
  };
  const p = new PushLifecycle(ports);
  return {
    p,
    ports,
    driver,
    rotate: () => rotated(),
    setToken: (v: string) => {
      token = v;
    },
    account: (v?: string) => {
      account = v;
    },
  };
}
it("requires permission once, rotates with locale/promotion consent and revokes before SDK deletion", async () => {
  const { p, ports, driver, setToken } = setup();
  await p.enable("uz", false);
  expect(p.enabled).toBe(true);
  expect(ports.register).toHaveBeenLastCalledWith(
    expect.objectContaining({
      token: "first-token",
      locale: "uz",
      promotions: false,
      consent: true,
    }),
  );
  setToken("rotated-token");
  await p.enable("ru", true, false);
  expect(driver.permission).toHaveBeenCalledTimes(1);
  expect(ports.register).toHaveBeenLastCalledWith(
    expect.objectContaining({
      token: "rotated-token",
      locale: "ru",
      promotions: true,
    }),
  );
  await p.disable();
  expect(p.enabled).toBe(false);
  expect(ports.save).toHaveBeenLastCalledWith(false);
  expect(ports.revoke).toHaveBeenCalledOnce();
  expect(driver.removeToken).toHaveBeenCalledOnce();
  await p.refresh();
  expect(ports.register).toHaveBeenCalledTimes(2);
});
it("permission denial never registers or saves consent", async () => {
  const { p, ports, driver } = setup();
  vi.mocked(driver.permission).mockResolvedValue(false);
  await expect(p.enable("en", false)).rejects.toThrow("permission");
  expect(ports.register).not.toHaveBeenCalled();
  expect(ports.save).not.toHaveBeenCalled();
});

it("revoking OS permission clears server registration and saves an offline retry intent", async () => {
  const { p, ports, driver } = setup();
  await p.enable("uz", false);
  vi.mocked(driver.token).mockRejectedValue(new Error("permission"));
  await expect(p.refresh()).rejects.toThrow("permission");
  expect(p.enabled).toBe(false);
  expect(ports.save).toHaveBeenLastCalledWith(false);
  expect(ports.revoke).toHaveBeenCalledOnce();
  expect(driver.removeToken).toHaveBeenCalledOnce();
});
it("late permission completion cannot register after disable or account switch", async () => {
  const { p, ports, driver, account } = setup();
  let release!: (v: boolean) => void;
  vi.mocked(driver.permission).mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const enabling = p.enable("uz", false);
  await vi.waitFor(() => expect(release).toBeDefined());
  const disabling = p.disable();
  release(true);
  await Promise.all([enabling, disabling]);
  expect(ports.register).not.toHaveBeenCalled();
  const second = p.enable("en", false);
  await new Promise((r) => setTimeout(r, 0));
  account("other-account");
  release(true);
  await second;
  expect(ports.register).not.toHaveBeenCalled();
});
it("a late registered token is revoked and local revocation intent survives offline failure", async () => {
  const { p, ports, driver } = setup();
  let finish!: () => void;
  ports.register.mockImplementation(
    () =>
      new Promise<void>((r) => {
        finish = r;
      }),
  );
  const pending = p.enable("uz", false);
  await vi.waitFor(() => expect(finish).toBeDefined());
  const disable = p.disable();
  finish();
  await Promise.all([pending, disable]);
  expect(ports.revoke).toHaveBeenCalled();
  expect(driver.removeToken).toHaveBeenCalled();
  expect(p.enabled).toBe(false);
  ports.revoke.mockRejectedValue(new Error("offline"));
  await expect(p.disable()).rejects.toThrow("offline");
  expect(ports.save).toHaveBeenLastCalledWith(false);
});
