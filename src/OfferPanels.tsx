import { useEffect, useRef, useState } from "react";
import { customerApi as api, ApiError } from "./customer-api";
import type { Locale } from "./core/types";
import type { OfferRule, OrderActualCosts } from "./offer-types";
import { amountMinor } from "./checkout-offer";
import { offersText, type OfferWord } from "./offers-i18n";

type Referral = {
  enabled: boolean;
  code: string | null;
  discountBps: number;
  pending: number;
  qualified: number;
  reversed: number;
  automaticRewards: false;
};
export function ReferralPanel({ locale }: { locale: Locale }) {
  const t = (k: OfferWord) => offersText(locale, k),
    [data, setData] = useState<Referral | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(true),
    epoch = useRef(0);
  useEffect(() => {
    live.current = true;
    const reset = () => {
      ++epoch.current;
      setData(null);
      setError("");
      setNotice("");
      setBusy(false);
    };
    api.sessionChanged.add(reset);
    return () => {
      live.current = false;
      ++epoch.current;
      api.sessionChanged.delete(reset);
    };
  }, []);
  async function load(create = false) {
    const ticket = ++epoch.current,
      token = api.session?.token;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await api.request<Referral>(
        "/referrals",
        create ? {} : undefined,
      );
      if (
        live.current &&
        ticket === epoch.current &&
        token === api.session?.token
      )
        setData(next);
    } catch {
      if (live.current && ticket === epoch.current) setError(t("failure"));
    } finally {
      if (live.current && ticket === epoch.current) setBusy(false);
    }
  }
  return (
    <details
      className="card"
      data-testid="referral-panel"
      onToggle={(e) => {
        if (e.currentTarget.open && !data && !busy) void load();
      }}
    >
      <summary>{t("referral")}</summary>
      <p>{t("referralTerms")}</p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {data && (
        <>
          {!data.enabled && <p>{t("off")}</p>}
          {data.code && (
            <>
              <p>
                <code data-testid="referral-code">{data.code}</code>
              </p>
              <button
                className="outline"
                disabled={busy}
                onClick={() => {
                  const ticket = epoch.current,
                    code = data.code!,
                    token = api.session?.token;
                  if (!navigator.clipboard) {
                    setError(t("failure"));
                    return;
                  }
                  void navigator.clipboard
                    .writeText(code)
                    .then(() => {
                      if (
                        live.current &&
                        ticket === epoch.current &&
                        token === api.session?.token
                      )
                        setNotice(t("copied"));
                    })
                    .catch(() => {
                      if (live.current && ticket === epoch.current)
                        setError(t("failure"));
                    });
                }}
              >
                {t("copy")}
              </button>
            </>
          )}
          <p data-testid="referral-counts">
            {t("pending")}: {data.pending} · {t("qualified")}: {data.qualified}{" "}
            · {t("reversed")}: {data.reversed}
          </p>
          {!data.code && data.enabled && (
            <button disabled={busy} onClick={() => void load(true)}>
              {t("create")}
            </button>
          )}
        </>
      )}
      <button className="outline" disabled={busy} onClick={() => void load()}>
        {t("refresh")}
      </button>
    </details>
  );
}
type Code = { id: string; code: string; kind: "promo"; rule: OfferRule };
type Settings = { codes: Code[]; policy: OfferRule };
type FinanceRow = {
  orderId: string;
  status: string;
  totalMinor: number;
  recognizedRevenueMinor: number;
  discountMinor: number;
  offerCode: string | null;
  costs: OrderActualCosts | null;
  costRevision: number;
  netContributionMinor: number | null;
};
const costKeys = [
  "materialsMinor",
  "packingMinor",
  "fulfillmentMinor",
  "providerFeeMinor",
  "marketingMinor",
  "referralRewardMinor",
] as const;
const defaultRule = (): OfferRule => ({
  discountType: "percent",
  value: 1000,
  maxDiscountMinor: 1_000_000,
  minSubtotalMinor: 0,
  startsAt: Date.now() - 60000,
  expiresAt: Date.now() + 30 * 86400000,
  maxUses: 1000,
  perAccountLimit: 1,
  enabled: true,
  revision: 0,
});
const localDate = (n: number) =>
  new Date(n - new Date(n).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const amount = (n: number) => (n / 100).toFixed(2);
function RuleForm({
  locale,
  rule,
  referral = false,
  onSave,
  disabled,
}: {
  locale: Locale;
  rule: OfferRule;
  referral?: boolean;
  onSave: (r: OfferRule) => Promise<void>;
  disabled: boolean;
}) {
  const t = (k: OfferWord) => offersText(locale, k),
    [kind, setKind] = useState(rule.discountType),
    [enabled, setEnabled] = useState(rule.enabled),
    [error, setError] = useState(false);
  const [fields, setFields] = useState({
    value: amount(rule.value),
    maxDiscount: amount(rule.maxDiscountMinor),
    minSubtotal: amount(rule.minSubtotalMinor),
    startsAt: localDate(rule.startsAt),
    expiresAt: localDate(rule.expiresAt),
    maxUses: String(rule.maxUses),
    perAccount: String(rule.perAccountLimit),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        try {
          const next = {
            ...rule,
            discountType: kind,
            enabled,
            value: amountMinor(fields.value),
            maxDiscountMinor: amountMinor(fields.maxDiscount),
            minSubtotalMinor: amountMinor(fields.minSubtotal),
            startsAt: new Date(fields.startsAt).getTime(),
            expiresAt: new Date(fields.expiresAt).getTime(),
            maxUses: Number(fields.maxUses),
            perAccountLimit: referral ? 1 : Number(fields.perAccount),
          };
          if (
            !Number.isSafeInteger(next.startsAt) ||
            !Number.isSafeInteger(next.expiresAt) ||
            next.startsAt >= next.expiresAt ||
            ![next.maxUses, next.perAccountLimit].every(
              (n) => Number.isSafeInteger(n) && n > 0,
            ) ||
            next.value > (kind === "percent" ? 9500 : 100_000_000) ||
            next.value < (referral ? 0 : 1)
          )
            throw Error("Invalid rule");
          void onSave(next);
        } catch {
          setError(true);
        }
      }}
    >
      <fieldset disabled={disabled}>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {t("enabled")}
        </label>
        <label>
          {t("discountType")}
          <select
            disabled={referral}
            value={kind}
            onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
          >
            <option value="percent">{t("percent")}</option>
            <option value="fixed">{t("fixed")}</option>
          </select>
        </label>
        {(
          [
            "value",
            "maxDiscount",
            "minSubtotal",
            "startsAt",
            "expiresAt",
            "maxUses",
            "perAccount",
          ] as const
        )
          .filter((k) => !referral || k !== "perAccount")
          .map((k) => (
            <label key={k}>
              {t(k)}
              {k === "value" ? ` (${kind === "percent" ? "%" : "UZS"})` : ""}
              <input
                required
                type={
                  k === "startsAt" || k === "expiresAt"
                    ? "datetime-local"
                    : "text"
                }
                inputMode={
                  k === "maxUses" || k === "perAccount" ? "numeric" : "decimal"
                }
                value={fields[k]}
                onChange={(e) =>
                  setFields((v) => ({ ...v, [k]: e.target.value }))
                }
              />
            </label>
          ))}
        {error && <p role="alert">{t("invalid")}</p>}
        <button type="submit">{t("save")}</button>
      </fieldset>
    </form>
  );
}
function CostForm({
  locale,
  row,
  onSave,
  disabled,
}: {
  locale: Locale;
  row: FinanceRow;
  onSave: (costs: OrderActualCosts) => Promise<void>;
  disabled: boolean;
}) {
  const t = (k: OfferWord) => offersText(locale, k),
    [fields, setFields] = useState(
      Object.fromEntries(
        costKeys.map((k) => [k, row.costs ? amount(row.costs[k]) : ""]),
      ) as Record<(typeof costKeys)[number], string>,
    ),
    [error, setError] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        try {
          const costs = Object.fromEntries(
            costKeys.map((k) => [k, amountMinor(fields[k])]),
          ) as OrderActualCosts;
          void onSave(costs);
        } catch {
          setError(true);
        }
      }}
    >
      <fieldset disabled={disabled}>
        <legend>{t("costs")}</legend>
        <p>{t("costHelp")}</p>
        {costKeys.map((k) => (
          <label key={k}>
            {t(k)}
            <input
              required
              inputMode="decimal"
              value={fields[k]}
              onChange={(e) =>
                setFields((v) => ({ ...v, [k]: e.target.value }))
              }
            />
          </label>
        ))}
        {error && <p role="alert">{t("invalid")}</p>}
        <button type="submit">{t("save")}</button>
      </fieldset>
    </form>
  );
}
export function OfferAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: OfferWord) => offersText(locale, k),
    [settings, setSettings] = useState<Settings | null>(null),
    [rows, setRows] = useState<FinanceRow[]>([]),
    [selection, setSelection] = useState(""),
    [code, setCode] = useState(""),
    [order, setOrder] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(false),
    epoch = useRef(0),
    currentToken = useRef(token);
  currentToken.current = token;
  async function action(mutation?: () => Promise<unknown>) {
    const ticket = ++epoch.current,
      credential = token;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mutation) await mutation();
      if (
        !live.current ||
        ticket !== epoch.current ||
        currentToken.current !== credential
      )
        return;
      const [next, report] = await Promise.all([
        api.request<Settings>("/admin/offers", undefined, credential),
        api.request<FinanceRow[]>(
          "/admin/offers/report",
          undefined,
          credential,
        ),
      ]);
      if (
        !live.current ||
        ticket !== epoch.current ||
        currentToken.current !== credential
      )
        return;
      setSettings(next);
      setRows(report);
      if (mutation) {
        setNotice(t("saved"));
        if (!selection && code) {
          const added = next.codes.find(
            (c) => c.code === code.trim().toUpperCase(),
          );
          if (added) setSelection(added.id);
        }
      }
    } catch (e) {
      if (live.current && ticket === epoch.current)
        setError(
          t(e instanceof ApiError && e.status === 409 ? "conflict" : "failure"),
        );
    } finally {
      if (live.current && ticket === epoch.current) setBusy(false);
    }
  }
  useEffect(() => {
    live.current = true;
    setSettings(null);
    setRows([]);
    setSelection("");
    setCode("");
    setOrder("");
    void action();
    return () => {
      live.current = false;
      ++epoch.current;
    };
  }, [token]);
  const selected = settings?.codes.find((c) => c.id === selection),
    row = rows.find((r) => r.orderId === order),
    money = (n: number) =>
      (n / 100).toLocaleString(locale, { maximumFractionDigits: 2 }) + " UZS";
  return (
    <section
      className="card"
      id="admin-offers"
      data-testid="offer-admin"
      style={{ overflowWrap: "anywhere" }}
    >
      <h2>{t("admin")}</h2>
      <p>{t("bounded")}</p>
      <p>{t("ruleHelp")}</p>
      <button className="outline" disabled={busy} onClick={() => void action()}>
        {t("refresh")}
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {settings && (
        <>
          <details data-testid="promo-editor">
            <summary>{t("promo")}</summary>
            <label>
              {t("promo")}
              <select
                value={selection}
                disabled={busy}
                onChange={(e) => {
                  setSelection(e.target.value);
                  setCode("");
                }}
              >
                <option value="">{t("newCode")}</option>
                {settings.codes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("newCode")}
              <input
                disabled={!!selected || busy}
                maxLength={24}
                value={selected?.code ?? code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <RuleForm
              key={`${selection}:${selected?.rule.revision ?? 0}`}
              locale={locale}
              disabled={busy || !(selected?.code ?? code).trim()}
              rule={selected?.rule ?? defaultRule()}
              onSave={async (rule) => {
                await action(() =>
                  api.request(
                    "/admin/offers/codes",
                    { code: selected?.code ?? code, rule },
                    token,
                  ),
                );
              }}
            />
          </details>
          <details data-testid="referral-policy">
            <summary>{t("policy")}</summary>
            <p>{t("referralTerms")}</p>
            <RuleForm
              key={settings.policy.revision}
              locale={locale}
              referral
              rule={settings.policy}
              disabled={busy}
              onSave={async (rule) => {
                await action(() =>
                  api.request("/admin/offers/policy", rule, token),
                );
              }}
            />
          </details>
          <details data-testid="cost-editor">
            <summary>{t("costs")}</summary>
            <select
              aria-label={t("costs")}
              value={order}
              disabled={busy}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="">—</option>
              {rows.map((r) => (
                <option key={r.orderId} value={r.orderId}>
                  {r.orderId} · {money(r.totalMinor)}
                </option>
              ))}
            </select>
            {row && (
              <div data-testid="order-costs">
                <p>
                  {t("revenue")}: {money(row.recognizedRevenueMinor)}
                </p>
                <p>
                  {t("discount")}: {money(row.discountMinor)} {row.offerCode}
                </p>
                <p data-testid="order-contribution">
                  {t("contribution")}:{" "}
                  {row.netContributionMinor === null
                    ? t("unknown")
                    : money(row.netContributionMinor)}
                </p>
                <CostForm
                  key={`${row.orderId}:${row.costRevision}`}
                  locale={locale}
                  row={row}
                  disabled={busy}
                  onSave={async (costs) => {
                    await action(() =>
                      api.request(
                        `/admin/orders/${row.orderId}/costs`,
                        { revision: row.costRevision, costs },
                        token,
                      ),
                    );
                  }}
                />
              </div>
            )}
          </details>
        </>
      )}
    </section>
  );
}
