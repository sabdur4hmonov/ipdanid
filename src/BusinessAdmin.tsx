import { useState, useEffect, useRef } from "react";
import type { Locale } from "./core/types";
import type { StorefrontSettings, Announcement } from "./business-types";
import { DEFAULT_STOREFRONT } from "./business-types";
import { businessText } from "./business-i18n";
import { customerApi as api } from "./customer-api";
import { useBusiness } from "./BusinessContext";
import { PushAnnouncementAction } from "./PushAnnouncementAction";
export function BusinessAdmin({
  locale,
  token,
  settingsAllowed,
  messagesAllowed,
  run,
}: {
  locale: Locale;
  token: string;
  settingsAllowed: boolean;
  messagesAllowed: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const t = (key: Parameters<typeof businessText>[1]) =>
    businessText(locale, key);
  const { refresh } = useBusiness();
  const [settings, setSettings] = useState(DEFAULT_STOREFRONT),
    [loaded, setLoaded] = useState(false),
    [messages, setMessages] = useState<Announcement[]>([]);
  const request = useRef<
    { key: string; signature: string; startsAt: number } | undefined
  >(undefined);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [active, setActive] = useState(true);
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [kind, setKind] = useState<"news" | "promotion">("news"),
    [expiry, setExpiry] = useState(
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    );
  useEffect(() => {
    void run(async () => {
      if (settingsAllowed)
        setSettings(
          await api.request<StorefrontSettings>(
            "/admin/settings",
            undefined,
            token,
          ),
        );
      if (messagesAllowed)
        setMessages(
          await api.request<Announcement[]>(
            "/admin/announcements",
            undefined,
            token,
          ),
        );
      setLoaded(true);
    });
  }, [token, settingsAllowed, messagesAllowed]);
  return (
    <div className="business-admin" data-testid="business-admin">
      {settingsAllowed && (
        <section className="card" id="admin-delivery">
          <h2>{t("business")}</h2>
          <fieldset disabled={!loaded}>
            {(
              [
                "brandName",
                "sellerName",
                "sellerPhone",
                "paymentDetails",
                "pickupAddress",
              ] as const
            ).map((key) => (
              <label key={key}>
                {t(key)}
                <input
                  maxLength={
                    key === "paymentDetails"
                      ? 500
                      : key === "pickupAddress"
                        ? 300
                        : key === "sellerPhone"
                          ? 40
                          : key === "brandName"
                            ? 60
                            : 100
                  }
                  value={settings[key]}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.deliveryEnabled}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    deliveryEnabled: e.target.checked,
                  }))
                }
              />
              {t("deliveryEnabled")}
            </label>
            <label>
              {t("deliveryFee")}
              <input
                type="number"
                min={0}
                max={1000000}
                step="0.01"
                value={settings.deliveryFeeMinor / 100}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    deliveryFeeMinor: Math.round(+e.target.value * 100),
                  }))
                }
              />
            </label>
            {(["uz", "uz-Cyrl", "ru", "en"] as const).map((lang) => (
              <label key={lang}>
                {t("homeTitle")} · {lang}
                <input
                  value={settings.homeTitle[lang] ?? ""}
                  maxLength={100}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      homeTitle: { ...s.homeTitle, [lang]: e.target.value },
                    }))
                  }
                />
              </label>
            ))}
            <button
              className="primary"
              onClick={() =>
                void run(async () => {
                  setSettings(
                    await api.request("/admin/settings", settings, token),
                  );
                  await refresh();
                })
              }
            >
              {t("save")}
            </button>
          </fieldset>
        </section>
      )}
      {messagesAllowed && (
        <section className="card" id="admin-announcements">
          <h2>{t("announcements")}</h2>
          <p>{t("messageDelivery")}</p>
          <label>
            {t("title")}
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {t("body")}
            <textarea
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label>
            {t("kind")}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="news">{t("news")}</option>
              <option value="promotion">{t("promotion")}</option>
            </select>
          </label>
          <label>
            {t("expiry")}
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <label>
            {t("startsAt")}
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            {t("active")}
          </label>
          <button
            className="primary"
            disabled={!loaded || !title.trim() || !body.trim() || !expiry}
            onClick={() =>
              void run(async () => {
                const signature = JSON.stringify({
                  title,
                  body,
                  kind,
                  expiry,
                  startsAt,
                  active,
                });
                if (request.current?.signature !== signature)
                  request.current = {
                    key: crypto.randomUUID(),
                    signature,
                    startsAt: Date.now(),
                  };
                await api.request(
                  "/admin/announcements",
                  {
                    title,
                    body,
                    kind,
                    startsAt: startsAt
                      ? new Date(startsAt).getTime()
                      : (editing?.startsAt ?? request.current.startsAt),
                    active,
                    endsAt: new Date(expiry + "T23:59:59").getTime(),
                    ...(editing
                      ? {
                          id: editing.id,
                          revision: editing.revision,
                        }
                      : { requestKey: request.current.key }),
                  },
                  token,
                );
                setEditing(null);
                request.current = undefined;
                setTitle("");
                setBody("");
                setStartsAt("");
                setActive(true);
                setMessages(
                  await api.request("/admin/announcements", undefined, token),
                );
                await refresh();
              })
            }
          >
            {t("publish")}
          </button>
          {messages.map((a) => (
            <article key={a.id} className="customer-item">
              <strong>{a.title}</strong>
              <p>{a.body}</p>
              <PushAnnouncementAction
                locale={locale}
                token={token}
                announcement={a}
                run={run}
              />
              <button
                className="outline"
                onClick={() => {
                  setEditing(a);
                  setTitle(a.title);
                  setBody(a.body);
                  setKind(a.kind);
                  const local = new Date(a.startsAt);
                  local.setMinutes(
                    local.getMinutes() - local.getTimezoneOffset(),
                  );
                  setStartsAt(local.toISOString().slice(0, 16));
                  setActive(a.active);
                  setExpiry(new Date(a.endsAt).toISOString().slice(0, 10));
                  request.current = undefined;
                }}
              >
                {t("edit")}
              </button>
              {a.active && (
                <button
                  className="outline"
                  onClick={() =>
                    void run(async () => {
                      await api.request(
                        `/admin/announcements/${a.id}/revoke`,
                        { revision: a.revision },
                        token,
                      );
                      setMessages(
                        await api.request(
                          "/admin/announcements",
                          undefined,
                          token,
                        ),
                      );
                      await refresh();
                    })
                  }
                >
                  {t("revoke")}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
