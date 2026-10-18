import { expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { offlineShellSource } from "../src/core/offline-shell";
function worker(visible = false) {
  const handlers: Record<string, (e: unknown) => void> = {},
    notification = vi.fn(),
    postMessage = vi.fn(),
    focus = vi.fn(),
    openWindow = vi.fn();
  let clients: object[] = [
    {
      url: "https://app.test/",
      visibilityState: visible ? "visible" : "hidden",
      postMessage,
      focus,
    },
  ];
  runInNewContext(offlineShellSource("push-unit", []), {
    URL,
    self: {
      location: { origin: "https://app.test" },
      addEventListener: (name: string, handler: (e: unknown) => void) => {
        handlers[name] = handler;
      },
      registration: { showNotification: notification },
      clients: { matchAll: async () => clients, openWindow },
    },
  });
  const event = async (name: string, body: object) => {
    let work: Promise<unknown> | undefined;
    handlers[name]({
      ...body,
      waitUntil: (promise: Promise<unknown>) => {
        work = promise;
      },
    });
    await work;
  };
  return {
    event,
    notification,
    postMessage,
    focus,
    openWindow,
    clearClients: () => {
      clients = [];
    },
  };
}
it("refreshes foreground announcements without duplicate system notifications", async () => {
  const w = worker(true);
  await w.event("push", {
    data: {
      json: () => ({
        notification: { title: "News", body: "Unit" },
        data: { tag: "revision" },
      }),
    },
  });
  expect(w.postMessage).toHaveBeenCalledWith({ type: "IP_RASM_PUSH" });
  expect(w.notification).not.toHaveBeenCalled();
});
it("shows bounded background notifications and refuses all payload navigation URLs", async () => {
  const w = worker();
  await w.event("push", {
    data: {
      json: () => ({
        notification: { title: "X".repeat(300), body: "Y".repeat(2000) },
        data: { tag: "revision", url: "https://evil.test/?token=bad" },
      }),
    },
  });
  expect(w.notification).toHaveBeenCalledWith(
    "X".repeat(160),
    expect.objectContaining({ body: "Y".repeat(1000), data: { url: "/" } }),
  );
  await w.event("notificationclick", {
    notification: { close: vi.fn(), data: { url: "https://evil.test" } },
  });
  expect(w.focus).toHaveBeenCalledOnce();
  w.clearClients();
  await w.event("notificationclick", { notification: { close: vi.fn() } });
  expect(w.openWindow).toHaveBeenCalledWith("/");
  await w.event("push", {
    data: {
      json: () => {
        throw Error();
      },
    },
  });
  expect(w.notification).toHaveBeenCalledOnce();
});
