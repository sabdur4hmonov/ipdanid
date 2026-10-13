import { useState, useEffect } from "react";
import type { Locale } from "./core/types";
import { useBusiness } from "./BusinessContext";
import { businessText } from "./business-i18n";
import { customerCacheNamespace } from "./customer-api";
const DISMISSED = `${customerCacheNamespace}:dismissed-news`,
  PROMOTIONS = `${customerCacheNamespace}:promotions`;
const getPromoAllowed = () => {
  try {
    return localStorage.getItem(PROMOTIONS) === "yes";
  } catch {
    return false;
  }
};
export function Announcements({ locale }: { locale: Locale }) {
  const { announcements, clockOffset } = useBusiness();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED) || "[]")
        .filter((s: unknown) => typeof s === "string")
        .slice(-200);
    } catch {
      return [];
    }
  });
  const [promos, setPromos] = useState(getPromoAllowed),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const event = () => setPromos(getPromoAllowed());
    window.addEventListener("iprasm-promotions", event);
    return () => {
      clearInterval(timer);
      window.removeEventListener("iprasm-promotions", event);
    };
  }, []);
  return (
    <div className="announcement-list" data-testid="announcements">
      {announcements
        .filter(
          (a) =>
            a.active &&
            a.startsAt <= now + clockOffset &&
            a.endsAt > now + clockOffset &&
            !dismissed.includes(a.id) &&
            (a.kind === "news" || promos),
        )
        .map((a) => (
          <article key={a.id} className="announcement">
            <div>
              <strong>{a.title}</strong>
              <p>{a.body}</p>
            </div>
            <button
              aria-label={businessText(locale, "dismiss")}
              onClick={() =>
                setDismissed((old) => {
                  const next = [...old, a.id].slice(-200);
                  try {
                    localStorage.setItem(DISMISSED, JSON.stringify(next));
                  } catch {
                    /* Dismiss remains available this session. */
                  }
                  return next;
                })
              }
            >
              ×
            </button>
          </article>
        ))}
    </div>
  );
}
export function PromotionPreference({ locale }: { locale: Locale }) {
  const [allowed, setAllowed] = useState(() => getPromoAllowed());
  return (
    <label className="promotion-preference">
      <input
        type="checkbox"
        checked={allowed}
        onChange={(e) => {
          setAllowed(e.target.checked);
          try {
            localStorage.setItem(PROMOTIONS, e.target.checked ? "yes" : "no");
          } catch {
            /* Session-only preference. */
          }
          window.dispatchEvent(new Event("iprasm-promotions"));
        }}
      />
      {businessText(locale, "promotional")}
    </label>
  );
}
