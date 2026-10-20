import { useEffect, useRef, useState } from "react";
import { customerApi as api } from "./customer-api";
import { useJourneyRun } from "./DigitalPanels";
import { commissionText, type CommissionWord } from "./commission-i18n";
import { countryName } from "./catalog-i18n";
import { journeyText } from "./journey-i18n";
import type { Locale, Instruction } from "./core/types";
import type {
  Commission,
  CommissionPolicy,
  CommissionGuide,
  CommissionAccept,
} from "./commission-types";
import type { CommerceProduct } from "./catalog-checkout";
import { checkoutRegion } from "./catalog-checkout";
import type { CommerceRegions } from "./commerce-regions";
import { useBusiness } from "./BusinessContext";
import { PaymentOptions } from "./PaymentOptions";
const money = (n: number, c: string, locale: Locale) =>
  (n / 100).toLocaleString(locale, { maximumFractionDigits: 2 }) + " " + c;
export function CommissionPolicyAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    task = useJourneyRun(locale, token),
    [products, setProducts] = useState<CommerceProduct[]>([]),
    [policies, setPolicies] = useState<CommissionPolicy[]>([]),
    [id, setId] = useState(""),
    [enabled, setEnabled] = useState(false);
  async function load() {
    const v = await api.request<{
      products: CommerceProduct[];
      policies: CommissionPolicy[];
    }>("/admin/commissions/products", undefined, token);
    return () => {
      setProducts(v.products);
      setPolicies(v.policies);
    };
  }
  useEffect(() => {
    void task.run(load);
  }, [token]);
  return (
    <section
      className="card"
      id="admin-commission-policy"
      data-testid="commission-policy"
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task.run(async () => {
            await api.request(
              "/admin/commissions/products",
              {
                version: "commission-product/1",
                productId: id,
                enabled,
                revision:
                  policies.find((p) => p.productId === id)?.revision ?? 0,
              },
              token,
            );
            const apply = await load();
            return () => {
              apply();
              task.setNotice(t("saved"));
            };
          });
        }}
      >
        <fieldset disabled={task.busy}>
          <label>
            {t("product")}
            <select
              required
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setEnabled(
                  policies.find((p) => p.productId === e.target.value)
                    ?.enabled ?? false,
                );
              }}
            >
              <option value="">—</option>
              {products
                .filter((p) => p.family === "string" && p.credits === 0)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name} · {p.profile_id}
                  </option>
                ))}
            </select>
          </label>
          <p>{t("missing")}</p>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t("enabled")}
          </label>
          <button disabled={!id}>{t("save")}</button>
        </fieldset>
      </form>
    </section>
  );
}
function Art({
  locale,
  row,
  token,
  admin,
  onReviewed,
}: {
  locale: Locale;
  row: Commission;
  token?: string;
  admin?: boolean;
  onReviewed: (hash: string) => void;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    task = useJourneyRun(locale, token),
    [guide, setGuide] = useState<Instruction>(),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (guide && canvas.current)
      void import("./core/render").then(({ renderInstruction }) => {
        if (canvas.current)
          renderInstruction(canvas.current.getContext("2d")!, guide);
      });
  }, [guide]);
  return (
    <div data-testid="commission-art">
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() =>
          void task.run(async (auth) => {
            const v = await api.request<CommissionGuide>(
              (admin ? "/admin" : "") + "/commissions/" + row.id + "/guide",
              undefined,
              auth,
            );
            const { checkedCommissionArt } = await import("./commission-art");
            await checkedCommissionArt(v, row);
            return () => {
              setGuide(v.instruction);
              onReviewed(v.artHash);
            };
          })
        }
      >
        {t("preview")}
      </button>
      {guide && (
        <>
          <p role="status">{t("artReviewed")}</p>
          <canvas
            width={1000}
            height={1000}
            ref={canvas}
            style={{ width: "100%", maxWidth: 500, height: "auto" }}
            aria-label={t("preview")}
          />
          {admin && (
            <button
              className="outline"
              disabled={task.busy}
              onClick={() =>
                void task.run(async () => {
                  const { exportPdf } = await import("./core/pdf");
                  const bytes = await exportPdf(guide, locale),
                    url = URL.createObjectURL(
                      new Blob([Uint8Array.from(bytes).buffer], {
                        type: "application/pdf",
                      }),
                    );
                  return () => {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "commission-" + row.id + ".pdf";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  };
                })
              }
            >
              {t("pdf")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
export function CommissionStudio({
  locale,
  products,
  policies,
  regions,
  durable,
  archives,
  onUpdated,
}: {
  locale: Locale;
  products: CommerceProduct[];
  policies: CommissionPolicy[];
  regions?: CommerceRegions;
  durable: boolean;
  archives: { id: string; sequence_hash: string; name: string }[];
  onUpdated: () => Promise<void>;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    [rows, setRows] = useState<Commission[]>([]),
    [productId, setProductId] = useState(""),
    [instructionId, setInstructionId] = useState(""),
    [consent, setConsent] = useState(false),
    key = useRef(crypto.randomUUID()),
    task = useJourneyRun(locale, undefined, () => {
      setRows([]);
      setConsent(false);
      setInstructionId("");
      key.current = crypto.randomUUID();
    });
  async function load(token: string) {
    const v = await api.request<Commission[]>("/commissions", undefined, token);
    return () => setRows(v);
  }
  useEffect(() => {
    void task.run(load);
  }, []);
  return (
    <section className="card" data-testid="commission-studio">
      <h2>{t("title")}</h2>
      <p>{t("intro")}</p>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {!durable && <p>{t("signIn")}</p>}
      {!policies.length && <p>{t("noPolicy")}</p>}
      {durable && policies.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void task.run(async (token) => {
              await api.request(
                "/commissions",
                {
                  instructionId,
                  productId,
                  consent,
                  locale,
                  requestKey: key.current,
                },
                token,
              );
              const apply = await load(token);
              return () => {
                apply();
                setConsent(false);
                key.current = crypto.randomUUID();
              };
            });
          }}
        >
          <fieldset disabled={task.busy}>
            <label>
              {t("product")}
              <select
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setConsent(false);
                  key.current = crypto.randomUUID();
                }}
              >
                <option value="">—</option>
                {policies.map((p) => {
                  const product = products.find((v) => v.id === p.productId);
                  return (
                    product && (
                      <option key={p.productId} value={p.productId}>
                        {product.name}
                      </option>
                    )
                  );
                })}
              </select>
            </label>
            <label>
              {t("archive")}
              <select
                required
                value={instructionId}
                onChange={(e) => {
                  setInstructionId(e.target.value);
                  setConsent(false);
                  key.current = crypto.randomUUID();
                }}
              >
                <option value="">—</option>
                {archives.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.sequence_hash.slice(0, 12)}
                  </option>
                ))}
              </select>
            </label>
            {!archives.length && <p>{t("empty")}</p>}
            <label>
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t("consent")}
            </label>
            <button
              disabled={!durable || !consent || !instructionId || !productId}
            >
              {t("request")}
            </button>
          </fieldset>
        </form>
      )}
      {rows.map((row) => (
        <CustomerCommission
          key={row.id + ":" + (api.session?.id ?? "")}
          row={row}
          locale={locale}
          regions={regions}
          onUpdated={async () => {
            await task.run(async (token, valid) => {
              const apply = await load(token);
              if (valid()) await onUpdated();
              return apply;
            });
          }}
        />
      ))}
    </section>
  );
}
function CustomerCommission({
  row,
  locale,
  regions,
  onUpdated,
}: {
  row: Commission;
  locale: Locale;
  regions?: CommerceRegions;
  onUpdated: () => Promise<void>;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    task = useJourneyRun(locale),
    [reviewed, setReviewed] = useState("");
  return (
    <article
      className="customer-item"
      data-testid="commission-request"
      data-commission-id={row.id}
    >
      <h3>{row.productName}</h3>
      <p>
        {t(row.state)}
        {row.order && " · " + t(row.order.status as CommissionWord)}
      </p>
      <p>
        {t("size")}: {row.widthMm} × {row.heightMm} mm · {row.lines}{" "}
        {t("lines")}
      </p>
      <p>{t("noPhoto")}</p>
      {row.note && (
        <p>
          {t("workshop")}: {row.note}
        </p>
      )}
      {task.status}
      <Art
        key={row.artHash}
        row={row}
        locale={locale}
        onReviewed={setReviewed}
      />
      {row.state === "approved" && !row.order && row.approval && (
        <AcceptCommission
          key={row.revision}
          row={row}
          locale={locale}
          regions={regions}
          reviewed={reviewed === row.artHash}
          onUpdated={onUpdated}
        />
      )}
      {row.order && (
        <>
          <p>
            {t("total")}:{" "}
            {money(row.order.totalMinor, row.order.currency, locale)}
          </p>
          <p>{t(row.production)}</p>
          {row.order.tracking.map((v) => (
            <p key={v}>
              {t("tracking")}: {v}
            </p>
          ))}
          {row.order.status === "pending" && (
            <PaymentOptions
              orderId={row.order.id}
              locale={locale}
              currency={row.order.currency}
              onUpdated={onUpdated}
            />
          )}
          {["paid", "fulfilled"].includes(row.order.status) && (
            <button
              className="outline"
              disabled={task.busy}
              onClick={() =>
                void task.run(async (token, valid) => {
                  await api.request(
                    "/orders/" + row.order!.id + "/return",
                    {},
                    token,
                  );
                  if (valid()) await onUpdated();
                  return () => {};
                })
              }
            >
              {t("return")}
            </button>
          )}
        </>
      )}
      {!["cancelled", "rejected"].includes(row.state) &&
        (!row.order || row.order.status === "pending") && (
          <button
            className="outline"
            disabled={task.busy}
            onClick={() =>
              void task.run(async (token, valid) => {
                await api.request(
                  "/commissions/" + row.id + "/cancel",
                  { revision: row.revision },
                  token,
                );
                if (valid()) await onUpdated();
                return () => {};
              })
            }
          >
            {t("cancel")}
          </button>
        )}
    </article>
  );
}
function AcceptCommission({
  row,
  locale,
  regions,
  reviewed,
  onUpdated,
}: {
  row: Commission;
  locale: Locale;
  regions?: CommerceRegions;
  reviewed: boolean;
  onUpdated: () => Promise<void>;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    { settings } = useBusiness(),
    task = useJourneyRun(locale),
    [confirm, setConfirm] = useState(false),
    [address, setAddress] = useState<CommissionAccept["address"]>({
      name: "",
      phone: "",
      city: "",
      street: "",
      country: "UZ",
      deliveryMethod: "pickup",
    }),
    attempt = useRef<CommissionAccept | undefined>(undefined),
    a = row.approval!,
    region = checkoutRegion(regions, address.country, settings),
    available =
      !!region?.enabled &&
      region.currency === a.currency &&
      (address.deliveryMethod === "pickup"
        ? !!region.pickupAddress
        : region.courierEnabled),
    total =
      a.priceMinor +
      (address.deliveryMethod === "courier"
        ? (region?.courierFeeMinor ?? 0)
        : 0);
  return (
    <form
      data-testid="commission-accept"
      onSubmit={(e) => {
        e.preventDefault();
        void task.run(async (token, valid) => {
          attempt.current ??= {
            revision: row.revision,
            artHash: row.artHash,
            requestKey: crypto.randomUUID(),
            address: { ...address },
            quote: {
              catalogRevision: a.catalogRevision,
              settingsRevision: a.settingsRevision,
              currency: a.currency,
              shippingRevision: regions?.revision ?? 0,
              totalMinor: total,
            },
          };
          await api.request(
            "/commissions/" + row.id + "/accept",
            attempt.current,
            token,
          );
          if (valid()) await onUpdated();
          return () => {};
        });
      }}
    >
      {task.status}
      <fieldset disabled={task.busy || !!attempt.current}>
        <p>
          {t("approvedUntil")}: {new Date(a.expiresAt).toLocaleString(locale)}
        </p>
        <label>
          {t("country")}
          <select
            value={address.country}
            onChange={(e) =>
              setAddress({ ...address, country: e.target.value })
            }
          >
            {(regions?.regions ?? [{ country: "UZ", enabled: true }])
              .filter((r) => r.enabled)
              .map((r) => (
                <option key={r.country} value={r.country}>
                  {countryName(locale, r.country)}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("method")}
          <select
            value={address.deliveryMethod}
            onChange={(e) =>
              setAddress({
                ...address,
                deliveryMethod: e.target.value as "pickup" | "courier",
              })
            }
          >
            <option value="pickup">{t("pickup")}</option>
            <option value="courier">{t("courier")}</option>
          </select>
        </label>
        {address.deliveryMethod === "pickup" && <p>{region?.pickupAddress}</p>}
        {(
          [
            "name",
            "phone",
            ...(address.deliveryMethod === "courier" ? ["city", "street"] : []),
          ] as const
        ).map((field) => (
          <label key={field}>
            {t(field as CommissionWord)}
            <input
              required
              maxLength={200}
              minLength={field === "phone" ? 7 : 2}
              autoComplete={
                field === "phone" ? "tel" : field === "name" ? "name" : "off"
              }
              value={address[field as keyof typeof address]}
              onChange={(e) =>
                setAddress({ ...address, [field]: e.target.value })
              }
            />
          </label>
        ))}
        <p>
          {t("total")}: {money(total, a.currency, locale)}
        </p>
        <label>
          <input
            type="checkbox"
            required
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />
          {t("confirm")}
        </label>
        {!reviewed && <p>{t("reviewNeeded")}</p>}
        <button
          disabled={
            !available || !reviewed || !confirm || a.expiresAt <= Date.now()
          }
        >
          {t("accept")}
        </button>
      </fieldset>
      {!!attempt.current && !task.busy && (
        <button
          className="outline"
          type="button"
          onClick={() => {
            attempt.current = undefined;
            setConfirm(false);
            void onUpdated();
          }}
        >
          {t("refresh")}
        </button>
      )}
      {!!attempt.current && !task.busy && (
        <button type="submit">{journeyText(locale, "retry")}</button>
      )}
    </form>
  );
}
export function CommissionOrdersAdmin({
  locale,
  token,
  canFulfill,
}: {
  locale: Locale;
  token: string;
  canFulfill: boolean;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    task = useJourneyRun(locale, token),
    [rows, setRows] = useState<Commission[]>([]);
  async function load() {
    const v = await api.request<Commission[]>(
      "/admin/commissions",
      undefined,
      token,
    );
    return () => setRows(v);
  }
  useEffect(() => {
    void task.run(load);
  }, [token]);
  return (
    <section
      className="card"
      id="admin-commissions"
      data-testid="commission-admin"
    >
      <h2>{t("orders")}</h2>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {rows.map((row) => (
        <AdminCommission
          key={row.id}
          row={row}
          token={token}
          canFulfill={canFulfill}
          locale={locale}
          onUpdated={() => task.run(load)}
        />
      ))}
    </section>
  );
}
function AdminCommission({
  row,
  locale,
  token,
  canFulfill,
  onUpdated,
}: {
  row: Commission;
  locale: Locale;
  token: string;
  canFulfill: boolean;
  onUpdated: () => Promise<void>;
}) {
  const t = (k: CommissionWord) => commissionText(locale, k),
    task = useJourneyRun(locale, token),
    [reviewed, setReviewed] = useState(""),
    [note, setNote] = useState(""),
    [tracking, setTracking] = useState("");
  const action = (path: string, body: object) =>
    task.run(async (_token, valid) => {
      await api.request(path, body, token);
      if (valid()) await onUpdated();
      return () => {};
    });
  return (
    <article
      className="customer-item"
      data-testid="commission-admin-request"
      data-commission-id={row.id}
    >
      <h3>{row.productName}</h3>
      <p>
        {t(row.state)}
        {row.order && " · " + t(row.order.status as CommissionWord)} ·{" "}
        {t(row.production)}
      </p>
      <p>
        {row.widthMm} × {row.heightMm} mm · {row.lines} {t("lines")}
      </p>
      {task.status}
      <Art
        row={row}
        locale={locale}
        token={token}
        admin
        onReviewed={setReviewed}
      />
      {canFulfill && !row.order && row.state !== "cancelled" && (
        <>
          <label>
            {t("note")}
            <textarea
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {(["approve", "reject"] as const).map((decision) => (
            <button
              key={decision}
              className={decision === "reject" ? "outline" : ""}
              disabled={
                task.busy ||
                reviewed !== row.artHash ||
                (decision === "approve" && !row.reviewQuote)
              }
              onClick={() =>
                void action("/admin/commissions/" + row.id + "/review", {
                  revision: row.revision,
                  artHash: row.artHash,
                  decision,
                  note,
                  quote: row.reviewQuote ?? null,
                })
              }
            >
              {t(decision)}
            </button>
          ))}
        </>
      )}
      {row.approval && (
        <p>{money(row.approval.priceMinor, row.approval.currency, locale)}</p>
      )}
      {row.reviewQuote && !row.order && (
        <p>
          {t("total")}:{" "}
          {money(row.reviewQuote.priceMinor, row.reviewQuote.currency, locale)}
        </p>
      )}
      {canFulfill && row.order?.status === "paid" && (
        <>
          {row.production !== "ready" ? (
            <button
              disabled={task.busy || reviewed !== row.artHash}
              onClick={() =>
                void action("/admin/commissions/" + row.id + "/production", {
                  revision: row.revision,
                  artHash: row.artHash,
                  state: row.production === "queued" ? "making" : "ready",
                })
              }
            >
              {t(row.production === "queued" ? "start" : "finish")}
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("/admin/orders/" + row.order!.id + "/fulfill", {
                  tracking,
                });
              }}
            >
              <label>
                {t("tracking")}
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </label>
              <button disabled={task.busy}>{t("ship")}</button>
            </form>
          )}
        </>
      )}
      {row.order?.tracking.map((v) => (
        <p key={v}>
          {t("tracking")}: {v}
        </p>
      ))}
    </article>
  );
}
