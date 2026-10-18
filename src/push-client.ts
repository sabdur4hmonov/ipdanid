import { Capacitor, registerPlugin } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { customerApi as api, customerCacheNamespace } from "./customer-api";
import { PushLifecycle, type PushIdentity } from "./push-lifecycle";
const key = customerCacheNamespace + ":push.v1";
const read = async () =>
  Capacitor.isNativePlatform()
    ? (await Preferences.get({ key })).value
    : localStorage.getItem(key);
type State = PushIdentity & {
  enabled: boolean;
  account?: string;
  revokePending?: boolean;
  hadToken?: boolean;
};
let state: State | undefined;
async function load() {
  if (state) return state;
  try {
    const raw = JSON.parse((await read()) || "null");
    if (
      raw &&
      /^[a-f0-9-]{36}$/.test(raw.installationId) &&
      /^[\w-]{43}$/.test(raw.installationSecret)
    )
      return (state = raw);
  } catch {
    /* Corrupt or unavailable storage never implies consent. */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return (state = {
    installationId: crypto.randomUUID(),
    installationSecret: btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
    enabled: false,
  });
}
async function save(enabled: boolean) {
  const s = await load();
  s.enabled = enabled;
  if (enabled) {
    s.account = api.session?.id;
    s.hadToken = true;
  }
  s.revokePending = !enabled && !!s.hadToken;
  if (Capacitor.isNativePlatform())
    await Preferences.set({ key, value: JSON.stringify(s) });
  else localStorage.setItem(key, JSON.stringify(s));
  window.dispatchEvent(new Event("iprasm-push-state"));
}
export const pushClient = new PushLifecycle({
  identity: async () => {
    const s = await load();
    return {
      installationId: s.installationId,
      installationSecret: s.installationSecret,
    };
  },
  account: () => api.session?.id,
  register: (body) => api.request("/push/devices", body),
  revoke: async (body) => {
    if (!api.session) return;
    // A never-registered installation has nothing to revoke.
    const devices =
      await api.request<{ id: string; active: number }[]>("/push/devices");
    if (devices.some((d) => d.id === body.installationId))
      await api.request("/push/revoke", body);
  },
  driver: async () => (await import("./push-driver")).createPushDriver(),
  save,
  cleanup: async () => {
    const s = await load();
    if (!s.revokePending) return;
    if (Capacitor.isNativePlatform())
      await registerPlugin<{ revoke(): Promise<void> }>(
        "IpRasmPushPrivacy",
      ).revoke();
    else if (s.account)
      await (
        await (await import("./push-driver")).createPushDriver()
      ).removeToken();
  },
  message: () => window.dispatchEvent(new Event("iprasm-push")),
});
export async function resumePush(locale: string, promotions: boolean) {
  const s = await load();
  if (s.revokePending && s.account === api.session?.id) {
    await disablePush();
    return;
  }
  if (s.enabled && s.account === api.session?.id)
    await pushClient.enable(locale, promotions, false);
}
export async function disablePush() {
  if (state) state.enabled = false;
  await pushClient.disable();
  const s = await load();
  s.revokePending = false;
  s.hadToken = false;
  if (Capacitor.isNativePlatform())
    await Preferences.set({ key, value: JSON.stringify(s) });
  else localStorage.setItem(key, JSON.stringify(s));
}
api.beforeLogout.add(disablePush);
export function startPushRuntime(locale: string) {
  let alive = true;
  const resume = async () => {
    if (!alive) return;
    try {
      await resumePush(
        locale,
        localStorage.getItem(customerCacheNamespace + ":promotions") === "yes",
      );
    } catch {
      /* Optional notifications never block local artwork. */
    }
  };
  void api
    .restore()
    .then(resume)
    .catch(() => {});
  const visible = () => {
    if (document.visibilityState === "visible") void resume();
  };
  api.sessionChanged.add(resume);
  window.addEventListener("online", resume);
  window.addEventListener("iprasm-promotions", resume);
  document.addEventListener("visibilitychange", visible);
  const native = Capacitor.isNativePlatform()
    ? import("@capacitor/app").then(({ App }) =>
        App.addListener("appStateChange", (s) => {
          if (s.isActive) void resume();
        }),
      )
    : undefined;
  return () => {
    alive = false;
    api.sessionChanged.delete(resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("iprasm-promotions", resume);
    document.removeEventListener("visibilitychange", visible);
    void native?.then((h) => h.remove());
  };
}
