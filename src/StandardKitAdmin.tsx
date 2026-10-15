import { useEffect, useState } from "react";
import type { Locale } from "./core/types";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  type StandardKitConfig,
} from "./core/standard-kit";
import { standardText } from "./standard-kit-i18n";
import { customerApi } from "./customer-api";
import { download } from "./download";
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
    Exclude<keyof StandardKitConfig, "version" | "revision" | "threadColor">,
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
            disabled={JSON.stringify(config) !== JSON.stringify(savedConfig)}
            onClick={() =>
              void run(async () => {
                const { standardKitPdf } =
                  await import("./core/standard-kit-pdf");
                await download(
                  `ip-rasm-standard-${kind}-r${config.revision}.pdf`,
                  new Blob(
                    [new Uint8Array(await standardKitPdf(config, kind))],
                    { type: "application/pdf" },
                  ),
                );
              })
            }
          >
            {t(kind)}
          </button>
        ))}
      </fieldset>
    </section>
  );
}
