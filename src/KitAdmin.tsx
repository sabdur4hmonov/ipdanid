import { useEffect, useRef, useState } from "react";
import { StandardKitAdmin } from "./StandardKitAdmin";
import type { Locale } from "./core/types";
import type { KitPolicy } from "../server/kit-store";
import { customerApi as api } from "./customer-api";
import { kitText } from "./kit-i18n";
import { download } from "./download";
import type { KitBatch } from "./kit-inserts";
export function KitAdmin({ locale, token }: { locale: Locale; token: string }) {
  const t = (k: Parameters<typeof kitText>[1]) => kitText(locale, k),
    [policy, setPolicy] = useState<KitPolicy>(),
    [data, setData] = useState<any>(),
    [count, setCount] = useState(10),
    [profile, setProfile] = useState("standard-base-r1"),
    [batch, setBatch] = useState<KitBatch>(),
    [account, setAccount] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    request = useRef(crypto.randomUUID()),
    uncertain = useRef(false);
  async function refresh() {
    const r = await api.request<any>("/admin/kits", undefined, token);
    setData(r);
    setPolicy(r.policy);
  }
  useEffect(() => {
    void refresh().catch(() => setError(t("error")));
  }, [token]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        /Batch already|already issued/.test(String(e))
          ? t("retry")
          : t("error"),
      );
    } finally {
      setBusy(false);
    }
  }
  const fields: [keyof KitPolicy, Parameters<typeof kitText>[1]][] = [
    ["quota", "quota"],
    ["codeDays", "codeDays"],
    ["creditDays", "creditDays"],
    ["maxKitsPerAccount", "maxKits"],
    ["buildsPerPeriod", "periodBuilds"],
    ["periodDays", "periodDays"],
  ];
  return (
    <section className="card kit-admin" data-testid="kit-admin">
      <h2>{t("batch")}</h2>
      <StandardKitAdmin locale={locale} token={token} onSaved={c=>setProfile(`standard-base-r${c.revision}`)}/>
      <p>{t("note")}</p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy} aria-label={t("batch")}>
        {policy &&
          fields.map(([key, label]) => (
            <label key={key}>
              {t(label)}
              <input
                type="number"
                min={key === "quota" || key === "periodDays" ? 1 : 0}
                value={policy[key]}
                onChange={(e) =>
                  setPolicy({ ...policy, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        <button
          disabled={!policy}
          onClick={() =>
            void run(async () => {
              setPolicy(
                await api.request<KitPolicy>(
                  "/admin/kits/policy",
                  policy,
                  token,
                ),
              );
            })
          }
        >
          {t("save")}
        </button>
        <label>
          {t("account")}
          <input value={account} onChange={(e) => setAccount(e.target.value)} />
        </label>
        <button
          disabled={!account || !policy}
          onClick={() =>
            void run(async () => {
              await api.request(
                "/admin/kits/limits",
                { accountId: account, limits: policy },
                token,
              );
              await refresh();
            })
          }
        >
          {t("limit")}
        </button>
        <label>
          {t("profile")}
          <input value={profile} onChange={(e) => setProfile(e.target.value)} />
        </label>
        <label>
          {t("count")}
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <button
          data-testid="issue-kit-batch"
          onClick={() =>
            void run(async () => {
              uncertain.current = true;
              const b = await api.request<KitBatch>(
                "/admin/kits/batch",
                { profile, count, requestKey: request.current },
                token,
              );
              setBatch(b);
              await refresh();
            })
          }
        >
          {t("issue")}
        </button>
        {uncertain.current && (
          <button
            onClick={() => {
              request.current = crypto.randomUUID();
              uncertain.current = false;
              setBatch(undefined);
            }}
          >
            {t("newBatch")}
          </button>
        )}
        {batch && (
          <div data-testid="kit-batch">
            <code>{batch.id}</code>
            <button
              onClick={() =>
                void run(async () => {
                  const { kitInserts } = await import("./kit-inserts");
                  await download(
                    "ip-rasm-kit-inserts.html",
                    await kitInserts(batch, locale),
                    "text/html",
                  );
                })
              }
            >
              {t("print")}
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  const { kitCodeCsv } = await import("./kit-inserts");
                  await download(
                    "ip-rasm-kit-codes.csv",
                    kitCodeCsv(batch),
                    "text/csv",
                  );
                })
              }
            >
              {t("csv")}
            </button>
          </div>
        )}
        <button onClick={() => void run(refresh)}>{t("refresh")}</button>
      </fieldset>
      {data && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("batch")}</th>
                  <th>{t("account")}</th>
                  <th>{t("quota")}</th>
                </tr>
              </thead>
              <tbody>
                {data.codes.map((c: any) => (
                  <tr key={c.hash}>
                    <td>
                      <code>{c.batch_id}</code>
                    </td>
                    <td>
                      <code>{c.account_id ?? "—"}</code>
                    </td>
                    <td>
                      {c.quota}
                      {!c.revoked && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await api.request(
                                "/admin/kits/revoke",
                                { id: c.batch_id },
                                token,
                              );
                              await refresh();
                            })
                          }
                        >
                          {t("revoke")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.accounts.map((a: any) => (
            <p key={a.account_id}>
              {a.account_id} · {t("usage")}: {a.builds}
              {" · "}
              {t("credits")}: {a.credits}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
