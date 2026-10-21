import { useEffect, useState } from "react";
import type { Locale } from "./core/types";
import type {
  InboxMessage,
  MailPreferences,
  MailDeliveryReport,
} from "./transactional-types";
import { customerApi as api } from "./customer-api";
import { useJourneyRun } from "./DigitalPanels";
import { mailText, mailState, type MailWord } from "./mail-i18n";
function Message({
  message,
  locale,
  children,
}: {
  message: InboxMessage;
  locale: Locale;
  children?: React.ReactNode;
}) {
  const t = (k: MailWord) => mailText(locale, k);
  return (
    <article
      className="customer-item"
      data-testid="inbox-message"
      data-message-id={message.id}
    >
      <h3>{message.title}</h3>
      <p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
        {message.body}
      </p>
      <p>
        <time dateTime={new Date(message.createdAt).toISOString()}>
          {new Date(message.createdAt).toLocaleString(locale)}
        </time>
      </p>
      <p data-testid="mail-state">{mailState(locale, message.state)}</p>
      {message.mock && <p>{t("mock")}</p>}
      {children}
    </article>
  );
}
export function InboxPanel({ locale }: { locale: Locale }) {
  const t = (k: MailWord) => mailText(locale, k),
    [messages, setMessages] = useState<InboxMessage[]>([]),
    [preferences, setPreferences] = useState<MailPreferences>(),
    [optIn, setOptIn] = useState(false),
    [emailLocale, setEmailLocale] = useState<Locale>(locale),
    task = useJourneyRun(locale, undefined, () => {
      setMessages([]);
      setPreferences(undefined);
      setOptIn(false);
    });
  async function load(token: string) {
    const [rows, p] = await Promise.all([
      api.request<InboxMessage[]>("/inbox?locale=" + locale, undefined, token),
      api.request<MailPreferences>("/inbox/preferences", undefined, token),
    ]);
    return () => {
      setMessages(rows);
      setPreferences(p);
      setOptIn(p.emailOptIn);
      setEmailLocale(p.locale);
    };
  }
  useEffect(() => {
    void task.run(load);
  }, [locale]);
  return (
    <section className="card" data-testid="customer-inbox">
      <h2>{t("title")}</h2>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {preferences && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void task.run(async (token, valid) => {
              await api.request(
                "/inbox/preferences",
                {
                  revision: preferences.revision,
                  locale: emailLocale,
                  emailOptIn: optIn,
                },
                token,
              );
              if (!valid()) return () => {};
              const apply = await load(token);
              return () => {
                apply();
                task.setNotice(t("saved"));
              };
            });
          }}
        >
          <fieldset disabled={task.busy}>
            <legend>{t("email")}</legend>
            <p>{t("privacy")}</p>
            {!preferences.configured ? (
              <p>{t("disabled")}</p>
            ) : preferences.mock ? (
              <p>{t("mock")}</p>
            ) : (
              <p>{t("configured")}</p>
            )}
            {!preferences.emailAvailable && <p>{t("register")}</p>}
            <label>
              <input
                type="checkbox"
                checked={optIn}
                disabled={
                  !preferences.emailAvailable ||
                  (!preferences.configured && !preferences.emailOptIn)
                }
                onChange={(e) => setOptIn(e.target.checked)}
              />
              {t("consent")}
            </label>
            <label>
              {t("language")}
              <select
                aria-label={t("language")}
                value={emailLocale}
                onChange={(e) => setEmailLocale(e.target.value as Locale)}
              >
                {(["uz", "uz-Cyrl", "ru", "en"] as const).map((l) => (
                  <option key={l} value={l}>
                    {t(l === "uz-Cyrl" ? "cyrl" : l)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">{t("save")}</button>
          </fieldset>
        </form>
      )}
      {!task.busy && !messages.length && <p>{t("empty")}</p>}
      {messages.map((message) => (
        <Message key={message.id} message={message} locale={locale}>
          {message.read ? (
            <p>{t("seen")}</p>
          ) : (
            <button
              className="outline"
              disabled={task.busy}
              onClick={() =>
                void task.run(async (token, valid) => {
                  await api.request(
                    "/inbox/" + message.id + "/read",
                    {},
                    token,
                  );
                  return valid() ? load(token) : () => {};
                })
              }
            >
              {t("read")}
            </button>
          )}
        </Message>
      ))}
      <p className="hint">{t("retention")}</p>
    </section>
  );
}
export function MailAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: MailWord) => mailText(locale, k),
    [report, setReport] = useState<MailDeliveryReport>(),
    task = useJourneyRun(locale, token, () => setReport(undefined));
  async function load() {
    const r = await api.request<MailDeliveryReport>(
      "/admin/mail",
      undefined,
      token,
    );
    return () => setReport(r);
  }
  useEffect(() => {
    setReport(undefined);
    void task.run(load);
  }, [token, locale]);
  return (
    <section id="admin-mail" className="card" data-testid="mail-admin">
      <h2>{t("admin")}</h2>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {report && (
        <>
          <p>
            {t(
              report.mode === "disabled"
                ? "serviceDisabled"
                : report.mode === "mock"
                  ? "serviceMock"
                  : "serviceResend",
            )}
          </p>
          {report.mode === "mock" && <p>{t("mock")}</p>}
          <p>{t("privacy")}</p>
          <dl>
            {report.counts.map((c) => (
              <div key={c.state}>
                <dt>{mailState(locale, c.state)}</dt>
                <dd>{c.count.toLocaleString(locale)}</dd>
              </div>
            ))}
          </dl>
          {!report.messages.length && <p>{t("empty")}</p>}
          {report.messages.map((message) => (
            <Message key={message.id} message={message} locale={locale}>
              <p>
                {t("attempts")}: {message.attempts} · {t("polls")}:{" "}
                {message.polls}
              </p>
              {message.canRetry && (
                <button
                  className="outline"
                  disabled={task.busy}
                  onClick={() =>
                    void task.run(async (_token, valid) => {
                      await api.request(
                        "/admin/mail/" + message.id + "/retry",
                        {},
                        token,
                      );
                      return valid() ? load() : () => {};
                    })
                  }
                >
                  {t("retry")}
                </button>
              )}
            </Message>
          ))}
          <p className="hint">{t("retention")}</p>
        </>
      )}
    </section>
  );
}
