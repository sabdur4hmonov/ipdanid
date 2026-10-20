import { useEffect, useRef, useState } from "react";
import { customerApi as api } from "./customer-api";
import type { Locale } from "./core/types";
import { catalogText } from "./catalog-i18n";
export function KitCreditTerms({ locale }: { locale: Locale }) {
  const t = (k: Parameters<typeof catalogText>[1]) => catalogText(locale, k),
    [grants, setGrants] = useState<
      { remaining: number; expires_at: number | null }[] | null
    >(null),
    [error, setError] = useState(false),
    epoch = useRef(0),
    live = useRef(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    live.current = true;
    const clear = () => {
      ++epoch.current;
      setGrants(null);
      setError(false);
      setOpen(false);
    };
    api.sessionChanged.add(clear);
    return () => {
      live.current = false;
      ++epoch.current;
      api.sessionChanged.delete(clear);
    };
  }, []);
  async function load() {
    const ticket = ++epoch.current,
      token = api.session?.token;
    setError(false);
    try {
      const next = await api.request<{
        grants: { remaining: number; expires_at: number | null }[];
      }>("/builds/account");
      if (
        live.current &&
        ticket === epoch.current &&
        token === api.session?.token
      )
        setGrants(next.grants);
    } catch {
      if (
        live.current &&
        ticket === epoch.current &&
        token === api.session?.token
      )
        setError(true);
    }
  }
  return (
    <details
      open={open}
      data-testid="kit-credit-terms"
      onToggle={(e) => {
        const value = e.currentTarget.open;
        setOpen(value);
        if (value && !grants) void load();
      }}
    >
      <summary>{t("grantTerms")}</summary>
      <p>{t("kitTerms")}</p>
      <button className="outline" onClick={() => void load()}>
        {t("refresh")}
      </button>
      {error && <p role="alert">{t("error")}</p>}
      {grants?.map((g, j) => (
        <p key={j}>
          {t("remaining")}: {g.remaining} ·{" "}
          {g.expires_at === null
            ? t("unlimited")
            : t("validUntil") +
              ": " +
              new Date(g.expires_at).toLocaleDateString(locale)}
        </p>
      ))}
      {grants?.length === 0 && <p>{t("empty")}</p>}
    </details>
  );
}
