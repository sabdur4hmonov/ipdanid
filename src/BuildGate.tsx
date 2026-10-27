import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { Instruction, Locale } from "./core/types";
import { kitText } from "./kit-i18n";
import { buildAccess } from "./build-access";
import { customerApi } from "./customer-api";
import { renderInstruction } from "./core/render";
import { download } from "./download";
import { standardText } from "./standard-kit-i18n";
import type { ProtectedPreview } from "./protected-generation";
const TrialClaimPanel = lazy(() => import("./TrialClaimPanel"));
export function BuildGate({
  instruction: i,
  locale,
  preview,
  onBuy,
  onReleased,
}: {
  instruction: Instruction | ProtectedPreview;
  locale: Locale;
  preview: ReactNode;
  onBuy: () => void;
  onReleased?: (guide: Instruction) => void;
}) {
  const local = "schema" in i ? i : undefined,
    remote = "schema" in i ? undefined : i,
    lines = local?.metrics.lines ?? remote!.lines;
  const t = (k: Parameters<typeof kitText>[1]) => kitText(locale, k),
    [code, setCode] = useState(""),
    [credits, setCredits] = useState<number>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    let epoch = 0;
    const reload = () => {
      const ticket = ++epoch;
      setCredits(undefined);
      setCode("");
      setError("");
      void (async () => {
        await customerApi.restore();
        const token = customerApi.session?.token;
        const a = await customerApi.request<{ credits: number }>(
          "/builds/account",
          undefined,
          token,
        );
        if (live && ticket === epoch && token === customerApi.session?.token)
          setCredits(a.credits);
      })().catch(() => {});
    };
    customerApi.sessionChanged.add(reload);
    reload();
    return () => {
      live = false;
      ++epoch;
      customerApi.sessionChanged.delete(reload);
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
            if (remote) {
              await download(
                "ip-rasm-preview.png",
                new Blob(
                  [
                    Uint8Array.from(atob(remote.preview), (c) =>
                      c.charCodeAt(0),
                    ),
                  ],
                  { type: "image/png" },
                ),
              );
              return;
            }
            const c = document.createElement("canvas");
            c.width = 1024;
            c.height = Math.round(
              (1024 * local!.profile.heightMm) / local!.profile.widthMm,
            );
            renderInstruction(c.getContext("2d")!, local!);
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
        {lines} {t("steps")} ·{" "}
        {local ? `${local.metrics.estimatedMeters.toFixed(1)} m · ` : ""}
        {(
          (lines *
            (local?.profile.standardKit?.config.secondsPerConnection ?? 8)) /
          60
        ).toFixed(1)}{" "}
        {t("minutes")}
      </p>
      {(local?.profile.standardKit || remote) && (
        <p data-testid="assembly-hours">
          {standardText(locale, "hours")}:{" "}
          {(
            (lines *
              (local?.profile.standardKit?.config.secondsPerConnection ?? 8)) /
            3600
          ).toFixed(1)}{" "}
          h
        </p>
      )}
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
          disabled={busy || credits === undefined || (!!remote && !onReleased)}
          onClick={() =>
            void run(async () => {
              const r = await buildAccess.unlock(
                local ?? {
                  sequenceHash: remote!.sequenceHash,
                  params: { accessPolicy: "kit-build/1" },
                },
                remote,
              );
              if (remote) {
                if (!r.instruction) throw Error("build-access/signature");
                onReleased!(r.instruction);
              }
              setCredits(r.credits);
            })
          }
        >
          {t("unlock")}
        </button>
        <button onClick={onBuy}>{t("buy")}</button>
      </div>
      <Suspense fallback={null}>
        <TrialClaimPanel locale={locale} onCredits={setCredits} />
      </Suspense>
      {busy && <p role="status">…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
