import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type { Announcement } from "./business-types";
import { customerApi as api } from "./customer-api";
import { pushText } from "./push-i18n";
export function PushAnnouncementAction({
  locale,
  token,
  announcement,
  run,
}: {
  locale: Locale;
  token: string;
  announcement: Announcement;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [mode, setMode] = useState("disabled"),
    [queued, setQueued] = useState(false),
    [busy, setBusy] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    let alive = true;
    void api
      .request<{ mode: string }>("/admin/push/status", undefined, token)
      .then((s) => {
        if (alive) setMode(s.mode);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);
  useEffect(() => {
    requestKey.current = crypto.randomUUID();
    setQueued(false);
  }, [announcement.revision]);
  const t = (key: Parameters<typeof pushText>[1]) => pushText(locale, key);
  return (
    <div data-testid="push-announcement">
      <button
        disabled={
          busy ||
          queued ||
          mode === "disabled" ||
          !announcement.active ||
          announcement.endsAt <= Date.now()
        }
        className="outline"
        onClick={() => {
          setBusy(true);
          void run(async () => {
            await api.request(
              "/admin/push/enqueue",
              {
                announcementId: announcement.id,
                requestKey: requestKey.current,
              },
              token,
            );
            setQueued(true);
          }).finally(() => setBusy(false));
        }}
      >
        {t(queued ? "queued" : "send")}
      </button>
      {mode === "mock" && <small>{t("mock")}</small>}
      {mode === "disabled" && <small>{t("fallback")}</small>}
    </div>
  );
}
