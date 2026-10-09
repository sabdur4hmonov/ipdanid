import type { PortraitSampling } from "./core/portrait-sampling";
import type { Key } from "./i18n";
export function PortraitSamplingPanel({
  sampling,
  t,
}: {
  sampling: PortraitSampling;
  t: (key: Key) => string;
}) {
  return (
    <section
      className="sampling-panel"
      data-testid="portrait-sampling"
      aria-label={t("samplingTitle")}
    >
      <h3>{t("samplingTitle")}</h3>
      <p className="fineprint">{t("samplingHint")}</p>
      <table>
        <thead>
          <tr>
            <th>{t("samplingFeature")}</th>
            <th>{t("samplingSize")}</th>
            <th>{t("samplingInside")}</th>
            <th>{t("samplingTone")}</th>
          </tr>
        </thead>
        <tbody>
          {sampling.map((r) => (
            <tr
              key={r.key}
              data-feature={r.key}
              data-width={r.widthPixels}
              data-height={r.heightPixels}
              data-inside={r.insideFraction}
              data-small={r.small}
              data-clipped={r.clipped}
            >
              <th scope="row">{t(r.key)}</th>
              <td>
                {r.widthPixels.toFixed(1)} × {r.heightPixels.toFixed(1)}
              </td>
              <td>{(100 * r.insideFraction).toFixed(0)}%</td>
              <td>{(100 * r.toneRange).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sampling.some((r) => r.clipped) && (
        <p className="sampling-warning">{t("samplingClipped")}</p>
      )}
      {sampling.some((r) => r.small) && (
        <p className="sampling-warning">{t("samplingSmall")}</p>
      )}
      {sampling.some((r) => r.samples > 0 && r.toneRange < 0.04) && (
        <p className="sampling-warning">{t("samplingFlat")}</p>
      )}
      <p className="fineprint">{t("samplingLimits")}</p>
    </section>
  );
}
