import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { customerApi, customerCacheNamespace } from "./customer-api";
import { DEFAULT_STOREFRONT, type Announcement } from "./business-types";
import {
  validBusinessSnapshot,
  type BusinessSnapshot,
} from "./business-snapshot";
import { RecoveryOrder } from "./recovery-order";
const KEY = `${customerCacheNamespace}:storefront.v1`;
const writes = new RecoveryOrder();
const BusinessContext = createContext({
  settings: DEFAULT_STOREFRONT,
  announcements: [] as Announcement[],
  refresh: async () => {},
  clockOffset: 0,
});
export const useBusiness = () => useContext(BusinessContext);
export function BusinessProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<BusinessSnapshot>({
    settings: DEFAULT_STOREFRONT,
    announcements: [],
  });
  const [clockOffset, setClockOffset] = useState(0);
  const state = useRef({
    alive: false,
    life: 0,
    request: 0,
    networkAccepted: false,
  });
  const refresh = useCallback(async () => {
    const s = state.current;
    if (!s.alive || !navigator.onLine) return;
    const life = s.life,
      request = ++s.request;
    try {
      const next = await customerApi.request<BusinessSnapshot>(
        "/storefront",
        undefined,
        "",
      );
      if (
        !validBusinessSnapshot(next) ||
        !s.alive ||
        s.life !== life ||
        s.request !== request
      )
        return;
      s.networkAccepted = true;
      setSnapshot(next);
      if (next.serverTime !== undefined)
        setClockOffset(next.serverTime - Date.now());
      await writes.run(async () => {
        if (!s.alive || s.life !== life || s.request !== request) return;
        const value = JSON.stringify(next);
        if (Capacitor.isNativePlatform())
          await Preferences.set({ key: KEY, value });
        else localStorage.setItem(KEY, value);
      });
    } catch {
      /* Optional commerce must not interrupt local artwork. */
    }
  }, []);
  useEffect(() => {
    const s = state.current;
    s.alive = true;
    const life = ++s.life;
    void (async () => {
      try {
        const raw = Capacitor.isNativePlatform()
          ? (await Preferences.get({ key: KEY })).value
          : localStorage.getItem(KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (
            s.alive &&
            s.life === life &&
            !s.networkAccepted &&
            validBusinessSnapshot(cached)
          )
            setSnapshot(cached);
        }
      } catch {
        /* Local artwork remains usable without optional cache. */
      }
      if (s.alive && s.life === life) await refresh();
    })();
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", visible);
    window.addEventListener("iprasm-push", visible);
    const pushed = (e: MessageEvent) => {
      if (e.data?.type === "IP_RASM_PUSH") void refresh();
    };
    navigator.serviceWorker?.addEventListener("message", pushed);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(visible, 60000);
    const native = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", (v) => {
          if (v.isActive) void refresh();
        })
      : undefined;
    return () => {
      if (s.life === life) s.alive = false;
      window.clearInterval(timer);
      window.removeEventListener("online", visible);
      window.removeEventListener("iprasm-push", visible);
      navigator.serviceWorker?.removeEventListener("message", pushed);
      document.removeEventListener("visibilitychange", visible);
      void native?.then((h) => h.remove());
    };
  }, [refresh]);
  return (
    <BusinessContext.Provider value={{ ...snapshot, refresh, clockOffset }}>
      {children}
    </BusinessContext.Provider>
  );
}
