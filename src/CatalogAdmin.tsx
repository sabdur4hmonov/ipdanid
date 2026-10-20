import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type { CatalogSku } from "./catalog-types";
import type { CommerceProduct } from "./catalog-checkout";
import {
  COMMERCE_CURRENCIES,
  COMMERCE_COUNTRIES,
  type CommerceRegions,
  type CommerceRegion,
} from "./commerce-regions";
import { customerApi as api } from "./customer-api";
import { catalogText, countryName, type CatalogWord } from "./catalog-i18n";
import { amountMinor } from "./checkout-offer";
function useAdminTask(locale: Locale, token: string) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [notice, setNotice] = useState(false),
    epoch = useRef(0),
    live = useRef(false),
    auth = useRef(token),
    gate = useRef(false);
  auth.current = token;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      ++epoch.current;
      gate.current = false;
    };
  }, [token]);
  async function run(task: () => Promise<() => void>) {
    if (gate.current) return;
    gate.current = true;
    const ticket = ++epoch.current,
      key = token;
    setBusy(true);
    setError(false);
    setNotice(false);
    try {
      const apply = await task();
      if (live.current && ticket === epoch.current && auth.current === key) {
        apply();
        setNotice(true);
      }
    } catch {
      if (live.current && ticket === epoch.current && auth.current === key)
        setError(true);
    } finally {
      if (live.current && ticket === epoch.current) {
        setBusy(false);
        gate.current = false;
      }
    }
  }
  return {
    busy,
    run,
    status: (
      <>
        {error && <p role="alert">{catalogText(locale, "error")}</p>}
        {notice && <p role="status">{catalogText(locale, "saved")}</p>}
      </>
    ),
  };
}
const newProduct = (): CommerceProduct => ({
  id: "",
  name: "",
  family: "string",
  price_minor: 0,
  currency: "UZS",
  stock: 0,
  credits: 3,
  revision: 0,
  description: "",
  profile_id: "standard-base-r1",
  active: 1,
});
const newSku = (): CatalogSku => ({
  version: "catalog-sku/1",
  productId: "",
  kind: "kit",
  group: "",
  label: "",
  material: "",
  sellable: true,
  parts: [],
  revision: 0,
});
export function CatalogAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: CatalogWord) => catalogText(locale, k),
    task = useAdminTask(locale, token),
    [products, setProducts] = useState<CommerceProduct[]>([]),
    [skus, setSkus] = useState<CatalogSku[]>([]),
    [p, setP] = useState(newProduct),
    [sku, setSku] = useState(newSku),
    [price, setPrice] = useState("0.00");
  async function load() {
    const next = await api.request<{
      products: CommerceProduct[];
      skus: CatalogSku[];
    }>("/admin/catalog", undefined, token);
    return () => {
      setProducts(next.products);
      setSkus(next.skus);
    };
  }
  useEffect(() => {
    void task.run(load);
  }, [token]);
  function choose(id: string) {
    const product = products.find((p) => p.id === id) ?? newProduct(),
      meta = skus.find((s) => s.productId === id) ?? {
        ...newSku(),
        productId: id,
        label: product.name,
      };
    setP(product);
    setPrice((product.price_minor / 100).toFixed(2));
    setSku(meta);
  }
  const text = (
    key: "id" | "name" | "description" | "profile_id",
    label: CatalogWord,
    max = 120,
  ) => (
    <label>
      {t(label)}
      <input
        required
        maxLength={max}
        value={p[key]}
        disabled={key === "id" && p.revision > 0}
        onChange={(e) => setP((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  );
  return (
    <section className="card" data-testid="catalog-admin" id="admin-catalog">
      <h2>{t("admin")}</h2>
      <p>{t("noFx")}</p>
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
            const saved = await api.request<{
              product: CommerceProduct;
              sku: CatalogSku;
            }>(
              "/admin/catalog/sku",
              {
                product: {
                  id: p.id,
                  name: p.name,
                  family: p.family,
                  price_minor: amountMinor(price),
                  currency: p.currency,
                  stock: p.stock,
                  credits: p.credits,
                  description: p.description,
                  expectedRevision: p.revision,
                  active: p.active,
                  profile_id: p.profile_id,
                },
                sku: { ...sku, productId: p.id },
              },
              token,
            );
            const apply = await load();
            return () => {
              apply();
              setP(saved.product);
              setSku(saved.sku);
            };
          });
        }}
      >
        <fieldset disabled={task.busy}>
          <label>
            {t("product")}
            <select
              value={p.revision ? p.id : ""}
              onChange={(e) => choose(e.target.value)}
            >
              <option value="">{t("newProduct")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.currency}
                </option>
              ))}
            </select>
          </label>
          {text("id", "id", 80)}
          {text("name", "name")}
          {text("description", "description", 2000)}
          {text("profile_id", "profile", 100)}
          <label>
            {t("family")}
            <select
              value={p.family}
              onChange={(e) => setP((v) => ({ ...v, family: e.target.value }))}
            >
              {[
                "string",
                "brick",
                "diamond",
                "paint",
                "book",
                "guided",
                "digital",
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            {t("currency")}
            <select
              value={p.currency}
              onChange={(e) =>
                setP((v) => ({ ...v, currency: e.target.value }))
              }
            >
              {COMMERCE_CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            {t("price")} ({p.currency})
            <input
              required
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          {(["stock", "credits"] as const).map((k) => (
            <label key={k}>
              {t(k)}
              <input
                required
                type="number"
                min="0"
                max={k === "stock" ? 100000 : 100}
                disabled={k === "credits" && sku.kind === "refill"}
                value={p[k]}
                onChange={(e) =>
                  setP((v) => ({ ...v, [k]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={!!p.active}
              onChange={(e) =>
                setP((v) => ({ ...v, active: e.target.checked ? 1 : 0 }))
              }
            />
            {t("active")}
          </label>
          <label>
            {t("kind")}
            <select
              value={sku.kind}
              onChange={(e) => {
                const kind = e.target.value as CatalogSku["kind"];
                setSku((v) => ({
                  ...v,
                  kind,
                  parts: kind === "kit" || kind === "refill" ? [] : v.parts,
                }));
                if (kind === "refill") setP((v) => ({ ...v, credits: 0 }));
              }}
            >
              {(["kit", "variant", "refill", "bundle"] as const).map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
          {(["group", "label", "material"] as const).map((k) => (
            <label key={k}>
              {t(k)}
              <input
                required={k !== "group"}
                maxLength={k === "material" ? 160 : 80}
                value={sku[k]}
                onChange={(e) => setSku((v) => ({ ...v, [k]: e.target.value }))}
              />
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={sku.sellable}
              onChange={(e) =>
                setSku((v) => ({ ...v, sellable: e.target.checked }))
              }
            />
            {t("sellable")}
          </label>
          {(sku.kind === "variant" || sku.kind === "bundle") && (
            <fieldset>
              <legend>{t("parts")}</legend>
              {sku.parts.map((part, j) => (
                <div key={j}>
                  <label>
                    {t("product")} {j + 1}
                    <select
                      required
                      value={part.productId}
                      onChange={(e) =>
                        setSku((v) => ({
                          ...v,
                          parts: v.parts.map((p, i) =>
                            i === j ? { ...p, productId: e.target.value } : p,
                          ),
                        }))
                      }
                    >
                      <option value="">—</option>
                      {products
                        .filter((v) => v.id !== p.id)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {t("quantity")} {j + 1}
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      value={part.quantity}
                      onChange={(e) =>
                        setSku((v) => ({
                          ...v,
                          parts: v.parts.map((p, i) =>
                            i === j
                              ? { ...p, quantity: Number(e.target.value) }
                              : p,
                          ),
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setSku((v) => ({
                        ...v,
                        parts: v.parts.filter((_, i) => i !== j),
                      }))
                    }
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="outline"
                disabled={sku.parts.length >= (sku.kind === "variant" ? 1 : 10)}
                onClick={() =>
                  setSku((v) => ({
                    ...v,
                    parts: [...v.parts, { productId: "", quantity: 1 }],
                  }))
                }
              >
                {t("addPart")}
              </button>
            </fieldset>
          )}
          <button type="submit">{t("save")}</button>
        </fieldset>
      </form>
    </section>
  );
}
export function RegionsAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: CatalogWord) => catalogText(locale, k),
    task = useAdminTask(locale, token),
    [policy, setPolicy] = useState<CommerceRegions>(),
    [rules, setRules] = useState<CommerceRegion[]>([]),
    [fees, setFees] = useState<string[]>([]);
  function apply(next: CommerceRegions) {
    setPolicy(next);
    setRules(next.usesLegacy ? [] : next.regions);
    setFees(
      next.usesLegacy
        ? []
        : next.regions.map((r) => (r.courierFeeMinor / 100).toFixed(2)),
    );
  }
  async function load() {
    const next = await api.request<CommerceRegions>(
      "/admin/regions",
      undefined,
      token,
    );
    return () => apply(next);
  }
  useEffect(() => {
    void task.run(load);
  }, [token]);
  return (
    <section className="card" id="admin-regions" data-testid="regions-admin">
      <h2>{t("regions")}</h2>
      <p>{t("noFx")}</p>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      {policy && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void task.run(async () => {
              const next = await api.request<CommerceRegions>(
                "/admin/regions",
                {
                  revision: policy.revision,
                  regions: rules.map((r, i) => ({
                    ...r,
                    courierFeeMinor: amountMinor(fees[i]),
                  })),
                },
                token,
              );
              return () => apply(next);
            });
          }}
        >
          <fieldset disabled={task.busy}>
            {rules.length === 0 && <p>{t("legacy")}</p>}
            {rules.map((r, j) => {
              function change<K extends keyof CommerceRegion>(
                key: K,
                value: CommerceRegion[K],
              ) {
                setRules((v) =>
                  v.map((r, i) => (i === j ? { ...r, [key]: value } : r)),
                );
              }
              return (
                <fieldset key={j}>
                  <legend>{countryName(locale, r.country)}</legend>
                  <label>
                    {t("country")} {j + 1}
                    <select
                      value={r.country}
                      onChange={(e) =>
                        change(
                          "country",
                          e.target.value as CommerceRegion["country"],
                        )
                      }
                    >
                      {COMMERCE_COUNTRIES.filter(
                        (c) =>
                          c === r.country ||
                          !rules.some((r) => r.country === c),
                      ).map((c) => (
                        <option key={c} value={c}>
                          {countryName(locale, c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("currency")} {j + 1}
                    <select
                      value={r.currency}
                      onChange={(e) =>
                        change(
                          "currency",
                          e.target.value as CommerceRegion["currency"],
                        )
                      }
                    >
                      {COMMERCE_CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => change("enabled", e.target.checked)}
                    />
                    {t("enabled")}
                  </label>
                  <label>
                    {t("pickup")} {j + 1}
                    <input
                      maxLength={300}
                      value={r.pickupAddress}
                      onChange={(e) => change("pickupAddress", e.target.value)}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={r.courierEnabled}
                      onChange={(e) =>
                        change("courierEnabled", e.target.checked)
                      }
                    />
                    {t("courier")}
                  </label>
                  <label>
                    {t("fee")} ({r.currency}) {j + 1}
                    <input
                      required
                      inputMode="decimal"
                      value={fees[j]}
                      onChange={(e) =>
                        setFees((v) =>
                          v.map((f, i) => (i === j ? e.target.value : f)),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setRules((v) => v.filter((_, i) => i !== j));
                      setFees((v) => v.filter((_, i) => i !== j));
                    }}
                  >
                    {t("remove")}
                  </button>
                </fieldset>
              );
            })}
            <button
              type="button"
              className="outline"
              disabled={rules.length >= COMMERCE_COUNTRIES.length}
              onClick={() => {
                const country = COMMERCE_COUNTRIES.find(
                  (c) => !rules.some((r) => r.country === c),
                )!;
                setRules((v) => [
                  ...v,
                  {
                    country,
                    currency: "UZS",
                    enabled: false,
                    pickupAddress: "",
                    courierEnabled: false,
                    courierFeeMinor: 0,
                  },
                ]);
                setFees((v) => [...v, "0.00"]);
              }}
            >
              {t("addRegion")}
            </button>
            <button
              type="button"
              className="outline"
              disabled={!rules.length}
              onClick={() => {
                setRules([]);
                setFees([]);
              }}
            >
              {t("clearRules")}
            </button>
            <button type="submit">{t("save")}</button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
