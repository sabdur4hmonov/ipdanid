import { useEffect, useState } from "react";
import type { Locale } from "./core/types";
import { customerApi as api, customerCacheNamespace } from "./customer-api";
import { pushClient, resumePush, disablePush } from "./push-client";
import { pushText } from "./push-i18n";
import type { PushConfig } from "./push-driver";
import { Capacitor } from "@capacitor/core";
export function PushSettings({ locale }: { locale: Locale }) {
  const [config, setConfig] = useState<PushConfig>(),
    [enabled, setEnabled] = useState(pushClient.enabled),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [count, setCount] = useState(0);
  const t = (key: Parameters<typeof pushText>[1]) => pushText(locale, key);
  useEffect(() => {
    let alive = true;
    const update = () => {
      if (alive) setEnabled(pushClient.enabled);
    };
    const resume = async () => {
      try {
        await resumePush(
          locale,
          localStorage.getItem(customerCacheNamespace + ":promotions") ===
            "yes",
        );
      } catch {
        /* Existing in-app announcements remain usable. */
      }
      update();
    };
    void api
      .request<PushConfig>("/push/config")
      .then((c) => {
        if (alive) setConfig(c);
      })
      .catch(() => {});
    void api
      .request<{ active: number }[]>("/push/devices")
      .then((d) => {
        if (alive) setCount(d.filter((x) => x.active).length);
      })
      .catch(() => {});
    void resume();
    const visible = () => {
      if (document.visibilityState === "visible") void resume();
    };
    window.addEventListener("iprasm-push-state", update);
    window.addEventListener("iprasm-promotions", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      window.removeEventListener("iprasm-push-state", update);
      window.removeEventListener("iprasm-promotions", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [locale]);
  const available =
    config?.mode === "fcm" && (Capacitor.isNativePlatform() || !!config.web);
  return (
    <section className="card" data-testid="push-settings">
      <h3>{t("title")}</h3>
      <p>{available ? t("consent") : t("fallback")}</p>
      <p>
        {t("connected")}: {count}
        {enabled ? " · " + t("enabled") : ""}
      </p>
      <button
        disabled={busy || (!available && !enabled)}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            if (enabled) await disablePush();
            else
              await pushClient.enable(
                locale,
                localStorage.getItem(customerCacheNamespace + ":promotions") ===
                  "yes",
              );
            setEnabled(pushClient.enabled);
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(enabled ? "disable" : "enable")}
      </button>
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
