import { useEffect, useState } from "react";
import type { Locale } from "./core/types";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  threadMeasurementWarning,
  type StandardKitConfig,
} from "./core/standard-kit";
import { standardText } from "./standard-kit-i18n";
import { customerApi } from "./customer-api";
import { download } from "./download";
import type { KitPdfKind } from "./core/standard-kit-pdf";
export function StandardKitAdmin({
  locale,
  token,
  onSaved,
}: {
  locale: Locale;
  token: string;
  onSaved?: (config: StandardKitConfig) => void;
}) {
  const [config, setConfig] = useState<StandardKitConfig>(
      structuredClone(DEFAULT_STANDARD_KIT),
    ),
    [savedConfig, setSavedConfig] = useState<StandardKitConfig>(
      structuredClone(DEFAULT_STANDARD_KIT),
    ),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const t = (key: Parameters<typeof standardText>[1]) =>
    standardText(locale, key);
  useEffect(() => {
    void customerApi
      .request<StandardKitConfig>("/kit-profiles")
      .then((c) => {
        standardProfiles(c);
        setConfig(c);
        setSavedConfig(c);
        onSaved?.(c);
      })
      .catch(() => setError(true));
  }, []);
  const fields: [
    Exclude<keyof StandardKitConfig, "version" | "revision" | "threadColor" | "measuredThreadMm">,
    Parameters<typeof standardText>[1],
  ][] = [
    ["baseMm", "base"],
    ["circleDiameterMm", "diameter"],
    ["squareSideMm", "squareSide"],
    ["heartEnvelopeMm", "heartEnvelope"],
    ["nails", "nails"],
    ["sectors", "sectors"],
    ["shaftMm", "shaft"],
    ["threadMm", "thread"],
    ["opacity", "opacity"],
    ["minHoleGapMm", "clearance"],
    ["edgeMm", "edge"],
    ["stockMeters", "stock"],
    ["secondsPerConnection", "seconds"],
  ];
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  const warning = threadMeasurementWarning(config.measuredThreadMm);
  const unsaved = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const exportTemplate = (kind: KitPdfKind, shape?: "circle" | "rectangle" | "heart") =>
    run(async () => {
      const { standardKitPdf } = await import("./core/standard-kit-pdf");
      const bytes = await standardKitPdf(savedConfig, kind, { locale, shape });
      await download(
        `ip-rasm-standard-${shape ? shape + "-" : ""}${kind}-r${savedConfig.revision}.pdf`,
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
    });
  return (
    <section data-testid="standard-kit-admin">
      <h3>{t("config")}</h3>
      <p>{t("profileNote")}</p>
      {error && <p role="alert">{t("configError")}</p>}
      <fieldset disabled={busy}>
        {fields.map(([key, label]) => (
          <label key={key}>
            {t(label)}
            <input
              type="number"
              step="any"
              value={config[key]}
              onChange={(e) =>
                setConfig((v) => ({ ...v, [key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        <label>
          {t("measuredThread")}
          <input
            type="number"
            step="any"
            min={0.05}
            max={0.5}
            value={config.measuredThreadMm ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setConfig(({ measuredThreadMm: _previous, ...rest }) =>
                value === "" ? rest : { ...rest, measuredThreadMm: Number(value) },
              );
            }}
          />
        </label>
        <p className="fineprint">{t("measuredThreadNote")}</p>
        {warning && <p role="status">{t(warning)}</p>}
        <label>
          {t("threadColor")}
          <input
            type="color"
            value={config.threadColor}
            onChange={(e) =>
              setConfig((v) => ({ ...v, threadColor: e.target.value }))
            }
          />
        </label>
        <button
          onClick={() =>
            void run(async () => {
              standardProfiles(config);
              const saved = await customerApi.request<StandardKitConfig>(
                "/admin/kits/profiles",
                config,
                token,
              );
              setConfig(saved);
              setSavedConfig(saved);
              onSaved?.(saved);
            })
          }
        >
          {t("saveConfig")}
        </button>
        <button
          onClick={() =>
            void run(async () => {
              const saved =
                await customerApi.request<StandardKitConfig>("/kit-profiles");
              setConfig(saved);
              setSavedConfig(saved);
              onSaved?.(saved);
            })
          }
        >
          {t("reload")}
        </button>
        {(["sheet", "tiles", "stickers"] as const).map((kind) => (
          <button
            key={kind}
            disabled={unsaved}
            onClick={() => void exportTemplate(kind)}
          >
            {t(kind)}
          </button>
        ))}
        {(["circle", "rectangle", "heart"] as const).map((shape) => (
          <button key={shape} disabled={unsaved || savedConfig.baseMm > 500}
            onClick={() => void exportTemplate("quadrants", shape)}>
            {t("a3Template")} · {t(shape)}
          </button>
        ))}
        {savedConfig.baseMm > 500 && <p className="fineprint">{t("a3TooLarge")}</p>}
      </fieldset>
    </section>
  );
}
