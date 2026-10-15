import { useEffect, useState, type ReactNode } from "react";
import type { Instruction, Locale } from "./core/types";
import { kitText } from "./kit-i18n";
import { buildAccess } from "./build-access";
import { customerApi } from "./customer-api";
import { renderInstruction } from "./core/render";
import { download } from "./download";
import { standardText } from "./standard-kit-i18n";
export function BuildGate({
  instruction: i,
  locale,
  preview,
  onBuy,
}: {
  instruction: Instruction;
  locale: Locale;
  preview: ReactNode;
  onBuy: () => void;
}) {
  const t = (k: Parameters<typeof kitText>[1]) => kitText(locale, k),
    [code, setCode] = useState(""),
    [credits, setCredits] = useState<number>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        /build-access\/(key|signature)/.test(String(e))
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
    <section className="card build-gate" data-testid="build-gate">
      <h1>{t("locked")}</h1>
      <p>{t("hint")}</p>
      <div aria-label={t("preview")}>{preview}</div>
      <button
        onClick={() =>
          void run(async () => {
            const c = document.createElement("canvas");
            c.width = 1024;
            c.height = Math.round(
              (1024 * i.profile.heightMm) / i.profile.widthMm,
            );
            renderInstruction(c.getContext("2d")!, i);
            const blob = await new Promise<Blob>((resolve, reject) =>
              c.toBlob((b) =>
                b ? resolve(b) : reject(Error("Preview unavailable")),
              ),
            );
            await download("ip-rasm-preview.png", blob);
          })
        }
      >
        {t("previewDownload")}
      </button>
      <p>
        {i.metrics.lines} {t("steps")} · {i.metrics.estimatedMeters.toFixed(1)}{" "}
        m · {((i.metrics.lines * (i.profile.standardKit?.config.secondsPerConnection??8)) / 60).toFixed(1)} {t("minutes")}
      </p>
      {i.profile.standardKit && <p data-testid="assembly-hours">{standardText(locale,"hours")}: {(i.metrics.lines*i.profile.standardKit.config.secondsPerConnection/3600).toFixed(1)} h</p>}
      {credits !== undefined && (
        <p data-testid="kit-credits">
          {t("credits")}: {credits}
        </p>
      )}
      <label>
        {t("code")}
        <input
          data-testid="kit-code"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
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
        {customerApi.session && (
          <button
            disabled={busy || !code.trim()}
            onClick={() =>
              void run(async () => {
                const a = await buildAccess.login(code.trim(), true);
                setCredits(a.credits);
                setCode("");
              })
            }
          >
            {t("attach")}
          </button>
        )}
        <button
          className="primary"
          data-testid="unlock-build"
          disabled={busy || credits === undefined}
          onClick={() =>
            void run(async () => {
              const r = await buildAccess.unlock(i);
              setCredits(r.credits);
            })
          }
        >
          {t("unlock")}
        </button>
        <button onClick={onBuy}>{t("buy")}</button>
      </div>
      {busy && <p role="status">…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
