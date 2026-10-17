import { useState } from "react";
import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
import { customerApi as api } from "./customer-api";
const words = {
  uz: {
    password: "Admin paroli",
    login: "Kirish",
    logout: "Admin hisobidan chiqish",
    error: "Parolni tekshirib, qayta urinib ko‘ring.",
    staff: "Xodim kodi",
  },
  ru: {
    password: "Пароль администратора",
    login: "Войти",
    logout: "Выйти из управления",
    error: "Проверьте пароль и повторите попытку.",
    staff: "Код сотрудника",
  },
  en: {
    password: "Administrator password",
    login: "Sign in",
    logout: "Sign out of administration",
    error: "Check the password and try again.",
    staff: "Staff access code",
  },
};
export function adminLoginText(locale: Locale, key: keyof typeof words.en) {
  return scriptText(words[baseLocale(locale)][key], locale);
}
export function AdminPasswordLogin({
  locale,
  token,
  onLogin,
  onLogout,
}: {
  locale: Locale;
  token: string;
  onLogin: (token: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const t = (key: keyof typeof words.en) => adminLoginText(locale, key);
  return (
    <form
      data-testid="admin-password-login"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(false);
        void (async () => {
          try {
            const session = await api.request<{ token: string }>(
              "/admin/login",
              { password },
            );
            setPassword("");
            await onLogin(session.token);
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {token ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void api
              .request("/admin/logout", {}, token)
              .catch(() => {})
              .finally(() => {
                onLogout();
                setBusy(false);
              });
          }}
        >
          {t("logout")}
        </button>
      ) : (
        <>
          <label>
            {t("password")}
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              maxLength={256}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy || password.length < 14}>{t("login")}</button>
        </>
      )}
      {error && <p role="alert">{t("error")}</p>}
    </form>
  );
}
