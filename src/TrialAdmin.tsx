import { useEffect, useRef, useState } from "react";
import { customerApi as api, ApiError } from "./customer-api";
import type { Locale } from "./core/types";
import type { TrialPolicy, TrialReport } from "./trial-types";
import { trialText, type TrialWord } from "./trial-i18n";
import { download } from "./download";

const localTime = (n: number) =>
  n
    ? new Date(n - new Date(n).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
export default function TrialAdmin({
  locale,
  token,
  settingsAllowed,
  codesAllowed,
}: {
  locale: Locale;
  token: string;
  settingsAllowed: boolean;
  codesAllowed: boolean;
}) {
  const t = (k: TrialWord) => trialText(locale, k);
  const [report, setReport] = useState<TrialReport>(),
    [policy, setPolicy] = useState<TrialPolicy>(),
    [count, setCount] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [lost, setLost] = useState(false),
    [codes, setCodes] = useState<string[]>([]);
  const life = useRef(0),
    currentToken = useRef(token),
    gate = useRef(false),
    pending = useRef<{ count: number; requestKey: string } | undefined>(
      undefined,
    );
  currentToken.current = token;
  async function run(action?: () => Promise<unknown>, applyPolicy = false) {
    if (gate.current) return;
    const epoch = life.current,
      credential = token,
      valid = () =>
        epoch === life.current && credential === currentToken.current;
    gate.current = true;
    setBusy(true);
    setError(false);
    try {
      if (action) await action();
      if (!valid()) return;
      const next = codesAllowed
        ? await api.request<TrialReport>("/admin/trials", undefined, credential)
        : {
            policy: await api.request<TrialPolicy>(
              "/admin/trials/policy",
              undefined,
              credential,
            ),
            claimed: 0,
            pending: 0,
            used: 0,
            batches: [],
          };
      if (valid()) {
        setReport(next);
        if (applyPolicy) setPolicy(next.policy);
      }
    } catch (e) {
      if (valid()) {
        setError(true);
        if (pending.current && e instanceof ApiError && e.status === 409)
          setLost(true);
      }
    } finally {
      if (valid()) {
        gate.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    ++life.current;
    gate.current = false;
    pending.current = undefined;
    setReport(undefined);
    setPolicy(undefined);
    setCodes([]);
    setLost(false);
    setError(false);
    return () => {
      ++life.current;
    };
  }, [token]);
  const patch = (value: Partial<TrialPolicy>) =>
    setPolicy((p) => p && { ...p, ...value });
  return (
    <details
      id="admin-trials"
      className="card"
      data-testid="trial-admin"
      onToggle={(e) => {
        if (e.currentTarget.open && !report && !gate.current)
          void run(undefined, true);
      }}
    >
      <summary>{t("admin")}</summary>
      <p>{t("terms")}</p>
      <p>{t("manual")}</p>
      {codesAllowed && report && (
        <p data-testid="trial-counts">
          {t("claimed")}: {report.claimed} · {t("pending")}: {report.pending} ·{" "}
          {t("used")}: {report.used}
        </p>
      )}
      <button
        className="outline"
        disabled={busy}
        onClick={() => void run(undefined, true)}
      >
        {t("refresh")}
      </button>
      {settingsAllowed && policy && (
        <fieldset disabled={busy}>
          <label>
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
            />
            {t("enabled")}
          </label>
          <label>
            {t("start")}
            <input
              type="datetime-local"
              value={localTime(policy.startsAt)}
              onChange={(e) =>
                patch({
                  startsAt: e.target.value
                    ? new Date(e.target.value).getTime()
                    : 0,
                })
              }
            />
          </label>
          <label>
            {t("end")}
            <input
              type="datetime-local"
              value={localTime(policy.expiresAt)}
              onChange={(e) =>
                patch({
                  expiresAt: e.target.value
                    ? new Date(e.target.value).getTime()
                    : 0,
                })
              }
            />
          </label>
          <label>
            {t("budget")}
            <input
              type="number"
              min={0}
              max={10000}
              value={policy.maxClaims}
              onChange={(e) => patch({ maxClaims: e.target.valueAsNumber })}
            />
          </label>
          <label>
            {t("days")}
            <input
              type="number"
              min={1}
              max={365}
              value={policy.creditDays}
              onChange={(e) => patch({ creditDays: e.target.valueAsNumber })}
            />
          </label>
          <button
            onClick={() =>
              void run(
                () => api.request("/admin/trials/policy", policy, token),
                true,
              )
            }
          >
            {t("save")}
          </button>
        </fieldset>
      )}
      {codesAllowed && report && (
        <>
          <label>
            {t("count")}
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              disabled={busy || !!pending.current}
              onChange={(e) => setCount(e.target.valueAsNumber)}
            />
          </label>
          <button
            disabled={
              busy ||
              lost ||
              !report.policy.enabled ||
              !Number.isSafeInteger(count) ||
              count < 1 ||
              count > 100
            }
            onClick={() => {
              const epoch = life.current,
                credential = token;
              pending.current ??= { count, requestKey: crypto.randomUUID() };
              const body = pending.current;
              void run(async () => {
                const result = await api.request<{ codes: string[] }>(
                  "/admin/trials/batch",
                  body,
                  credential,
                );
                if (
                  epoch !== life.current ||
                  credential !== currentToken.current
                )
                  return;
                setCodes(result.codes);
                pending.current = undefined;
                setLost(false);
              });
            }}
          >
            {t(pending.current ? "retry" : "issue")}
          </button>
          {lost && (
            <>
              <p role="alert">{t("lost")}</p>
              <button
                disabled={busy}
                onClick={() => {
                  pending.current = undefined;
                  setLost(false);
                }}
              >
                {t("newRequest")}
              </button>
            </>
          )}
          {!!codes.length && (
            <div data-testid="trial-issued">
              <p>{t("once")}</p>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {codes.join("\n")}
              </pre>
              <button
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    download(
                      "ip-rasm-private-trial-codes.txt",
                      new Blob([codes.join("\n")], {
                        type: "text/plain;charset=utf-8",
                      }),
                    ),
                  )
                }
              >
                {t("download")}
              </button>
              <button onClick={() => setCodes([])}>{t("clear")}</button>
            </div>
          )}
          {report.batches.map((b) => (
            <section
              key={b.id}
              data-testid="trial-batch"
              style={{ overflowWrap: "anywhere" }}
            >
              <code>{b.id}</code>
              <p>
                {b.count} · {t("claimed")}: {b.claimed} · {t("revoked")}:{" "}
                {b.revoked}
              </p>
              <button
                disabled={busy || b.count <= b.claimed + b.revoked}
                onClick={() =>
                  void run(() =>
                    api.request(
                      "/admin/trials/revoke",
                      { batchId: b.id },
                      token,
                    ),
                  )
                }
              >
                {t("revoke")}
              </button>
            </section>
          ))}
        </>
      )}
      {error && <p role="alert">{t("failure")}</p>}
    </details>
  );
}
