import { useEffect, useRef, useState } from "react";
import { customerApi as api } from "./customer-api";
import type { Locale } from "./core/types";
import type { TrialClaim, TrialStatus } from "./trial-types";
import { trialText, type TrialWord } from "./trial-i18n";

export default function TrialClaimPanel({
  locale,
  onCredits,
}: {
  locale: Locale;
  onCredits?: (credits: number) => void | Promise<void>;
}) {
  const t = (k: TrialWord) => trialText(locale, k);
  const [code, setCode] = useState(""),
    [data, setData] = useState<TrialStatus>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [notice, setNotice] = useState(false),
    [credential, setCredential] = useState(api.session?.token);
  const life = useRef(0),
    gate = useRef(false),
    pending = useRef<{ code: string; requestKey: string } | undefined>(
      undefined,
    );
  useEffect(() => {
    const reset = () => {
      ++life.current;
      gate.current = false;
      pending.current = undefined;
      setCode("");
      setData(undefined);
      setBusy(false);
      setError(false);
      setNotice(false);
      setCredential(api.session?.token);
    };
    api.sessionChanged.add(reset);
    return () => {
      ++life.current;
      api.sessionChanged.delete(reset);
    };
  }, []);
  async function run(claim = false) {
    if (gate.current) return;
    const epoch = life.current,
      token = api.session?.token;
    const valid = () => epoch === life.current && token === api.session?.token;
    gate.current = true;
    setBusy(true);
    setError(false);
    setNotice(false);
    try {
      if (claim) {
        pending.current ??= {
          code: code.trim().toUpperCase(),
          requestKey: crypto.randomUUID(),
        };
        const result = await api.request<TrialClaim>(
          "/trial/claim",
          pending.current,
          token,
        );
        if (!valid()) return;
        setNotice(true);
        setCode("");
        pending.current = undefined;
        await onCredits?.(result.credits);
        if (!valid()) return;
      }
      const result = await api.request<TrialStatus>("/trial", undefined, token);
      if (valid()) setData(result);
    } catch {
      if (valid()) setError(true);
    } finally {
      if (valid()) {
        gate.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <details
      className="card"
      data-testid="trial-claim"
      key={credential ?? "none"}
      onToggle={(e) => {
        if (e.currentTarget.open && credential && !data && !gate.current)
          void run();
      }}
    >
      <summary>{t("title")}</summary>
      <p>{t("terms")}</p>
      {!data?.durable ? (
        <p>{t("login")}</p>
      ) : (
        <>
          {data?.claimed && (
            <p data-testid="trial-balance">
              {t("remaining")}: {data.remaining} · {t("expires")}:{" "}
              {new Date(data.expiresAt!).toLocaleString(locale)}
            </p>
          )}
          {!data?.claimed && (
            <>
              <label>
                {t("code")}
                <input
                  data-testid="trial-code"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={36}
                  value={code}
                  disabled={busy}
                  onChange={(e) => {
                    setCode(e.target.value);
                    pending.current = undefined;
                  }}
                />
              </label>
              <button
                disabled={
                  busy ||
                  !/^TRIAL-[A-F0-9]{30}$/.test(code.trim().toUpperCase())
                }
                onClick={() => void run(true)}
              >
                {t("claim")}
              </button>
            </>
          )}
          <button
            className="outline"
            disabled={busy}
            onClick={() => void run()}
          >
            {t("refresh")}
          </button>
        </>
      )}
      {notice && <p role="status">{t("accepted")}</p>}
      {error && <p role="alert">{t("failure")}</p>}
    </details>
  );
}
