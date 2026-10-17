import { useState } from "react";
import { resolveBackendUrl } from "./backend-url";
import {
  NATIVE_SERVER_KEY,
  nativeServerEditing,
} from "./native-server-settings";
import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  uz: {
    label: "Server manzili",
    save: "Saqlash va qayta ochish",
    hint: "Debug APK uchun HTTPS server manzilini /api bilan kiriting. Hisoblar har bir server uchun alohida saqlanadi.",
    error: "HTTPS server manzili kerak. Mahalliy sinovda127.0.0.1 ishlatiladi.",
  },
  ru: {
    label: "Адрес сервера",
    save: "Сохранить и перезапустить",
    hint: "Для отладочного APK укажите HTTPS адрес с /api. Учётные записи хранятся отдельно для каждого сервера.",
    error: "Нужен HTTPS адрес. Для локального теста разрешён127.0.0.1.",
  },
  en: {
    label: "Server address",
    save: "Save and reopen",
    hint: "For the debug APK, enter an HTTPS address ending in /api. Each server keeps a separate account.",
    error:
      "Enter an HTTPS server address;127.0.0.1 is allowed for local tests.",
  },
};
export function NativeServerSettings({ locale }: { locale: Locale }) {
  const [value, setValue] = useState(() => {
      try {
        return (
          localStorage.getItem(NATIVE_SERVER_KEY) ??
          import.meta.env.VITE_NATIVE_API_BASE ??
          ""
        );
      } catch {
        return "";
      }
    }),
    [error, setError] = useState(false);
  const t = (k: keyof typeof words.en) =>
    scriptText(words[baseLocale(locale)][k], locale);
  if (!nativeServerEditing) return null;
  return (
    <section className="card" data-testid="native-server-settings">
      <label>
        {t("label")}
        <input
          data-testid="native-server-address"
          type="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <p>{t("hint")}</p>
      <button
        onClick={() => {
          const url = resolveBackendUrl(true, value);
          if (!url) {
            setError(true);
            return;
          }
          try {
            localStorage.setItem(NATIVE_SERVER_KEY, url);
            location.reload();
          } catch {
            setError(true);
          }
        }}
      >
        {t("save")}
      </button>
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
