import { useEffect, useState } from "react";
import type { Locale } from "./core/types";
import type { AnalyticsPreferences, AnalyticsReport } from "./analytics-types";
import { customerApi as api } from "./customer-api";
import { analyticsClient } from "./analytics-client";
import { useJourneyRun } from "./DigitalPanels";
import { analyticsText, type AnalyticsWord } from "./analytics-i18n";
import { download } from "./download";
export function AnalyticsSettings({ locale }: { locale: Locale }) {
  const t = (k: AnalyticsWord) => analyticsText(locale, k),
    [preferences, setPreferences] = useState<AnalyticsPreferences>(),
    [enabled, setEnabled] = useState(false),
    [eraseAck, setEraseAck] = useState(false),
    task = useJourneyRun(locale, undefined, () => {
      setPreferences(undefined);
      setEnabled(false);
      setEraseAck(false);
    });
  function apply(p: AnalyticsPreferences, token: string) {
    setPreferences(p);
    setEnabled(p.enabled);
    analyticsClient.apply(p, token);
    void analyticsClient.refreshGuides();
  }
  async function load(token: string) {
    const p = await api.request<AnalyticsPreferences>(
      "/analytics/preferences",
      undefined,
      token,
    );
    return () => apply(p, token);
  }
  useEffect(() => {
    void task.run(load);
  }, [locale]);
  return (
    <section className="card" data-testid="analytics-settings">
      <h3>{t("title")}</h3>
      <p>{t("privacy")}</p>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {preferences && (
        <>
          <p data-testid="analytics-choice">
            {t(preferences.enabled ? "on" : "off")}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!enabled) analyticsClient.pause();
              void task.run(async (token) => {
                const p = await api.request<AnalyticsPreferences>(
                  "/analytics/preferences",
                  { revision: preferences.revision, enabled },
                  token,
                );
                return () => {
                  apply(p, token);
                  task.setNotice(t("saved"));
                };
              });
            }}
          >
            <fieldset disabled={task.busy}>
              <label>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                {t("consent")}
              </label>
              <button>{t("save")}</button>
            </fieldset>
          </form>
          <button
            className="outline"
            disabled={task.busy}
            onClick={() =>
              void task.run(async (token, valid) => {
                const data = await api.request(
                  "/analytics/export",
                  undefined,
                  token,
                );
                if (!valid()) return () => {};
                await download(
                  "ip-rasm-statistics.json",
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                );
                return () => task.setNotice(t("downloaded"));
              })
            }
          >
            {t("download")}
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!eraseAck) return;
              analyticsClient.pause();
              void task.run(async (token) => {
                const p = await api.request<AnalyticsPreferences>(
                  "/analytics/erase",
                  { revision: preferences.revision, erase: true },
                  token,
                );
                return () => {
                  apply(p, token);
                  setEraseAck(false);
                  task.setNotice(t("erased"));
                };
              });
            }}
          >
            <fieldset disabled={task.busy}>
              <label>
                <input
                  type="checkbox"
                  checked={eraseAck}
                  onChange={(e) => setEraseAck(e.target.checked)}
                />
                {t("eraseAck")}
              </label>
              <button className="outline" disabled={!eraseAck}>
                {t("erase")}
              </button>
            </fieldset>
          </form>
        </>
      )}
      <p className="hint">{t("retention")}</p>
    </section>
  );
}
export function AnalyticsAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: AnalyticsWord) => analyticsText(locale, k),
    [report, setReport] = useState<AnalyticsReport>(),
    task = useJourneyRun(locale, token, () => setReport(undefined));
  async function load() {
    const r = await api.request<AnalyticsReport>(
      "/admin/analytics",
      undefined,
      token,
    );
    return () => setReport(r);
  }
  useEffect(() => {
    void task.run(load);
  }, [token, locale]);
  const row = (key: AnalyticsWord, value: number | null) => (
    <div key={key}>
      <dt>{t(key)}</dt>
      <dd data-metric={key}>
        {value === null
          ? t("noReplies")
          : value.toLocaleString(locale, { maximumFractionDigits: 1 })}
      </dd>
    </div>
  );
  return (
    <section
      id="admin-analytics"
      className="card"
      data-testid="analytics-admin"
    >
      <h2>{t("admin")}</h2>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      <p>{t("coverage")}</p>
      <p>{t("manual")}</p>
      {report && (
        <>
          <p>
            {t("range")}: {new Date(report.from).toLocaleDateString(locale)} –{" "}
            {new Date(report.until).toLocaleDateString(locale)}
          </p>
          <dl>
            {row("accounts", report.consentedAccounts)}
            {(
              Object.keys(report.funnel) as (keyof AnalyticsReport["funnel"])[]
            ).map((k) => row(k, report.funnel[k]))}
            {row("guidesStarted", report.assembly.guidesStarted)}
            {row("guidesCompleted", report.assembly.guidesCompleted)}
            {(
              Object.keys(
                report.commerce,
              ) as (keyof AnalyticsReport["commerce"])[]
            ).map((k) => row(k, report.commerce[k]))}
            {row("tickets", report.support.tickets)}
            {row("answered", report.support.answered)}
            {row("replyHours", report.support.averageFirstReplyHours)}
          </dl>
          {report.assembly.buckets.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>{t("progress")}</th>
                  <th>{t("guides")}</th>
                </tr>
              </thead>
              <tbody>
                {report.assembly.buckets.map((r) => (
                  <tr key={r.bucket}>
                    <td>
                      {r.bucket === 10
                        ? "100"
                        : r.bucket * 10 + "–" + (r.bucket * 10 + 9)}
                      %
                    </td>
                    <td>{r.guides.toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
