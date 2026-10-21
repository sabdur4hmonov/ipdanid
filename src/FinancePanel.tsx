import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type {
  FinanceReport,
  FinanceOrder,
  ManualMoneyAction,
} from "./finance-types";
import { financeText, type FinanceWord } from "./finance-i18n";
import { customerApi as api } from "./customer-api";
import { useJourneyRun } from "./DigitalPanels";
const money = (order: FinanceOrder, locale: Locale) =>
  (order.amountMinor / 100).toLocaleString(locale, {
    maximumFractionDigits: 2,
  }) +
  " " +
  order.currency;
export default function FinancePanel({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: FinanceWord) => financeText(locale, k),
    task = useJourneyRun(locale, token),
    [report, setReport] = useState<FinanceReport>();
  async function load() {
    const v = await api.request<FinanceReport>(
      "/admin/finance/reconciliation",
      undefined,
      token,
    );
    return () => setReport(v);
  }
  useEffect(() => {
    void task.run(load);
  }, [token]);
  return (
    <section id="admin-finance" className="card" data-testid="finance-admin">
      <h2>{t("title")}</h2>
      <p>{t("notice")}</p>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {report && !report.orders.length && <p>{t("empty")}</p>}
      {report?.orders.map((order) => (
        <article
          key={order.id}
          className="customer-item"
          data-testid="finance-order"
          data-order-id={order.id}
        >
          <h3>{order.id.slice(0, 8)}</h3>
          <p>
            {t(order.status)} · {t(order.settlement)}
          </p>
          <p>
            {t("total")}: {money(order, locale)}
          </p>
          {order.invoices.map((invoice) => (
            <p key={invoice.id}>
              {t("invoice")}: {invoice.provider === "click" ? "Click" : "Payme"}{" "}
              ·{" "}
              {t(
                invoice.state === 2
                  ? "paid"
                  : invoice.state < 0
                    ? "cancelled"
                    : "pending",
              )}
              <br />
              <code style={{ overflowWrap: "anywhere" }}>{invoice.id}</code>
            </p>
          ))}
          {order.problems.length ? (
            order.problems.map((problem) => (
              <p role="status" key={problem}>
                {t(problem as FinanceWord)}
              </p>
            ))
          ) : (
            <p>{t("zeroProblems")}</p>
          )}
          {order.status === "pending" &&
            (order.invoices.some((i) => i.state === 1 || i.state === 2) ? (
              <p>{t("providerConflict")}</p>
            ) : (
              <MoneyForm
                key={order.id + order.status}
                order={order}
                token={token}
                locale={locale}
                onUpdated={() => task.run(load)}
              />
            ))}
          {order.status === "return_requested" &&
            order.settlement === "manual" && (
              <MoneyForm
                key={order.id + order.status}
                order={order}
                token={token}
                locale={locale}
                refund
                onUpdated={() => task.run(load)}
              />
            )}
        </article>
      ))}
      <section data-testid="finance-statement">
        <h3>{t("statement")}</h3>
        <p>{t("statementHelp")}</p>
        <button
          className="outline"
          disabled={!report?.orders.some((order) => order.invoices.length)}
          onClick={() => {
            const rows = (report?.orders ?? [])
              .flatMap((order) =>
                order.invoices.map((invoice) => ({
                  invoiceId: invoice.id,
                  provider: invoice.provider,
                  currency: "UZS",
                  amountMinor: invoice.amountMinor,
                  state: invoice.state,
                })),
              )
              .slice(0, 200);
            const url = URL.createObjectURL(
                new Blob([JSON.stringify({ rows }, null, 2)], {
                  type: "application/json",
                }),
              ),
              link = document.createElement("a");
            link.href = url;
            link.download = "local-invoice-rows.json";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          {t("exportLocal")}
        </button>
        <label>
          {t("upload")}
          <input
            type="file"
            accept="application/json,.json"
            disabled={task.busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void task.run(async () => {
                if (file.size > 100000) throw Error("Statement size limit");
                const value = JSON.parse(await file.text());
                await api.request("/admin/finance/statement", value, token);
                return await load();
              });
            }}
          />
        </label>
      </section>
      {report?.comparisons.map((comparison) => (
        <article
          data-testid="finance-comparison"
          key={comparison.id}
          className="customer-item"
        >
          <h3>{t("comparison")}</h3>
          <p>{t("unverified")}</p>
          {comparison.createdAt && (
            <p>
              {t("reportTime")}:{" "}
              {new Date(comparison.createdAt).toLocaleString(locale)}
            </p>
          )}
          {comparison.results.map((row) => (
            <p key={row.invoiceId}>
              {row.invoiceId.slice(0, 8)} · {t(row.result as FinanceWord)}
            </p>
          ))}
        </article>
      ))}
    </section>
  );
}
function MoneyForm({
  order,
  locale,
  token,
  refund,
  onUpdated,
}: {
  order: FinanceOrder;
  locale: Locale;
  token: string;
  refund?: boolean;
  onUpdated: () => Promise<void>;
}) {
  const t = (k: FinanceWord) => financeText(locale, k),
    task = useJourneyRun(locale, token),
    [reference, setReference] = useState(""),
    [ack, setAck] = useState(false),
    attempt = useRef<ManualMoneyAction | undefined>(undefined);
  return (
    <form
      data-testid={refund ? "manual-refund" : "manual-receipt"}
      onSubmit={(e) => {
        e.preventDefault();
        void task.run(async (_auth, valid) => {
          attempt.current ??= {
            requestKey: crypto.randomUUID(),
            amountMinor: order.amountMinor,
            currency: order.currency,
            reference,
            ...(refund
              ? { returned: true as const }
              : { received: true as const }),
          };
          await api.request(
            "/admin/finance/orders/" +
              order.id +
              (refund ? "/refund" : "/receipt"),
            attempt.current,
            token,
          );
          if (valid()) await onUpdated();
          return () => task.setNotice(t("saved"));
        });
      }}
    >
      {task.status}
      <fieldset disabled={task.busy || !!attempt.current}>
        <label>
          {t("reference")}
          <input
            required
            minLength={3}
            maxLength={120}
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            required
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          {t(refund ? "ackReturned" : "ackReceived")}
        </label>
        <button disabled={!ack || reference.trim().length < 3}>
          {t(refund ? "returned" : "received")}
        </button>
      </fieldset>
      {!!attempt.current && !task.busy && (
        <>
          <button type="submit">{t("retry")}</button>
          <button
            className="outline"
            type="button"
            onClick={() => {
              attempt.current = undefined;
              setAck(false);
              void onUpdated();
            }}
          >
            {t("refresh")}
          </button>
        </>
      )}
    </form>
  );
}
