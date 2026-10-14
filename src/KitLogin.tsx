import { useState } from "react";
import type { Locale } from "./core/types";
import { kitText } from "./kit-i18n";
import { buildAccess } from "./build-access";
export function KitLogin({
  locale,
  onLogin,
}: {
  locale: Locale;
  onLogin: () => Promise<void>;
}) {
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const t = (k: Parameters<typeof kitText>[1]) => kitText(locale, k);
  return (
    <section className="card kit-login">
      <h2>{t("login")}</h2>
      <label>
        {t("loginCode")}
        <input
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={code}
          maxLength={100}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <button
        disabled={busy || !code.trim()}
        onClick={() => {
          setBusy(true);
          setError("");
          void buildAccess
            .login(code.trim())
            .then(async () => {
              setCode("");
              await onLogin();
            })
            .catch(() => setError(navigator.onLine ? t("error") : t("offline")))
            .finally(() => setBusy(false));
        }}
      >
        {t("login")}
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
