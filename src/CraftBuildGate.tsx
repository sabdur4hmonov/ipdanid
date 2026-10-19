import { useEffect, useState } from "react";
import { buildAccess, type BuildAccessReference } from "./build-access";
import { kitText } from "./kit-i18n";
import type { Locale } from "./core/types";
export function CraftBuildGate({
  reference,
  locale,
  onUnlocked,
  hint,
}: {
  reference: BuildAccessReference;
  locale: Locale;
  onUnlocked: () => void;
  hint?: string;
}) {
  const [code, setCode] = useState(""),
    [credits, setCredits] = useState<number>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const t = (key: Parameters<typeof kitText>[1]) => kitText(locale, key);
  useEffect(() => {
    let live = true;
    buildAccess
      .account()
      .then((a) => {
        if (live) setCredits(a.credits);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [reference.sequenceHash]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        /build-access\/(signature|key)/.test(String(e))
          ? t("keyError")
          : navigator.onLine
            ? t("error")
            : t("offline"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section data-testid="craft-build-gate">
      <h2>{t("locked")}</h2>
      <p>{hint ?? t("hint")}</p>
      {credits !== undefined && (
        <p data-testid="craft-credits">
          {t("credits")}: {credits}
        </p>
      )}
      <label>
        {t("loginCode")}
        <input
          aria-label={t("loginCode")}
          autoComplete="off"
          autoCapitalize="none"
          maxLength={100}
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
        />
      </label>
      <div className="grid-actions">
        <button
          disabled={busy || !code.trim()}
          onClick={() =>
            void run(async () => {
              const a = await buildAccess.login(code.trim());
              setCredits(a.credits);
              setCode("");
            })
          }
        >
          {t("login")}
        </button>
        <button
          disabled={busy || credits === undefined}
          onClick={() =>
            void run(async () => {
              const r = await buildAccess.unlock(reference);
              setCredits(r.credits);
              if (!(await buildAccess.allowed(reference)))
                throw Error("build-access/signature");
              onUnlocked();
            })
          }
        >
          {t("unlock")}
        </button>
      </div>
      {busy && <p role="status">…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
