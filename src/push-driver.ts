import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PushDriver } from "./push-lifecycle";
import { customerApi } from "./customer-api";
export type PushConfig = {
  mode: "disabled" | "mock" | "fcm";
  enabled: boolean;
  web: {
    apiKey: string;
    appId: string;
    projectId: string;
    messagingSenderId: string;
    vapidKey: string;
  } | null;
};
// Imported only following an explicit opt-in, or an already saved opt-in.
export async function createPushDriver(): Promise<PushDriver> {
  const config = await customerApi.request<PushConfig>("/push/config");
  if (config.mode !== "fcm") throw Error("unconfigured");
  const native = Capacitor.isNativePlatform(),
    platform = native ? Capacitor.getPlatform() : "web";
  let options:
    | { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration }
    | undefined;
  if (!native) {
    if (
      !config.web ||
      !window.isSecureContext ||
      !("serviceWorker" in navigator)
    )
      throw Error("unconfigured");
    const { initializeApp, getApps } = await import("firebase/app");
    if (!getApps().length) initializeApp(config.web);
    options = {
      vapidKey: config.web.vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    };
  }
  const { FirebaseMessaging: sdk } =
    await import("@capacitor-firebase/messaging");
  if (!(await sdk.isSupported()).isSupported) throw Error("unconfigured");
  if (platform === "android")
    await sdk.createChannel({
      id: "iprasm-news",
      name: "Ip Rasm",
      importance: 3,
    });
  return {
    platform:
      platform === "ios" ? "ios" : platform === "android" ? "android" : "web",
    permission: async () =>
      (await sdk.requestPermissions()).receive === "granted",
    token: async () => {
      if ((await sdk.checkPermissions()).receive !== "granted")
        throw Error("permission");
      return (await sdk.getToken(options)).token;
    },
    removeToken: async () => {
      if (native)
        await registerPlugin<{ revoke(): Promise<void> }>(
          "IpRasmPushPrivacy",
        ).revoke();
      else await sdk.deleteToken();
    },
    listen: async (token, message) => {
      const handles = [await sdk.addListener("notificationReceived", message)];
      if (native)
        handles.push(
          await sdk.addListener("tokenReceived", token),
          await sdk.addListener("notificationActionPerformed", message),
        );
      return async () => {
        await Promise.all(handles.map((h) => h.remove()));
      };
    },
  };
}
