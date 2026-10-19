import { useEffect, useMemo, useState } from "react";
import {
  makeSolidPlan,
  validateSolidPlan,
  solidPartMesh,
  solidTemplateSvg,
  solidLayoutSvg,
  SOLID_DEFAULTS,
  type SolidPlan,
  type SolidSource,
} from "./core/solid-plan";
import { meshFacts, solidStl } from "./core/solid-geometry";
import { localCraftStore, type CraftProject } from "./local-craft-store";
import { buildAccess, type BuildAccessReference } from "./build-access";
import { CraftBuildGate } from "./CraftBuildGate";
import { SolidPreview } from "./SolidPreview";
import { solidText } from "./solid-i18n";
import { download } from "./download";
import type { Locale } from "./core/types";
import { CraftSpeechButton } from "./CraftSpeechButton";
import { craftNumber } from "./craft-voice";
import { baseLocale } from "./uzbek-script";
const store = localCraftStore(
  "solid",
  validateSolidPlan,
  (g) => g.parts.length,
);
export default function SolidStudio({ locale }: { locale: Locale }) {
  const [source, setSource] = useState<SolidSource>({
      ...SOLID_DEFAULTS.frame,
    }),
    [project, setProject] = useState<CraftProject<SolidPlan>>(),
    [library, setLibrary] = useState<CraftProject<SolidPlan>[]>([]),
    [step, setStep] = useState(1),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [allowedHash, setAllowedHash] = useState("");
  const t = (key: Parameters<typeof solidText>[1]) => solidText(locale, key),
    g = project?.guide,
    allowed = !!g && allowedHash === g.sequenceHash;
  const reference: BuildAccessReference | undefined = g
    ? { sequenceHash: g.sequenceHash, params: { accessPolicy: g.accessPolicy } }
    : undefined;
  const facts = useMemo(
    () => (g ? meshFacts(solidPartMesh(g, step)) : undefined),
    [g?.sequenceHash, step],
  );
  useEffect(() => {
    let live = true;
    store
      .read()
      .then((all) => {
        if (live) setLibrary(all);
      })
      .catch(() => {
        if (live) setError(t("error"));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    setAllowedHash("");
    const refresh = () => {
      if (reference)
        void buildAccess
          .allowed(reference)
          .then((ok) => {
            if (live) setAllowedHash(ok ? reference.sequenceHash : "");
          })
          .catch(() => {
            if (live) setAllowedHash("");
          });
    };
    refresh();
    window.addEventListener("iprasm-build-access", refresh);
    return () => {
      live = false;
      window.removeEventListener("iprasm-build-access", refresh);
    };
  }, [g?.sequenceHash]);
  async function run(fn: () => Promise<void>) {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        t(
          message.includes("conflict")
            ? "conflict"
            : message.includes("limit")
              ? "limit"
              : "error",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function open(p: CraftProject<SolidPlan>) {
    setProject(p);
    setSource(structuredClone(p.guide.source));
    setStep(Math.min(p.guide.parts.length, p.confirmed + 1));
  }
  async function retain(p: CraftProject<SolidPlan>, expected?: number) {
    setLibrary(await store.save(p, expected));
    open(p);
  }
  async function exported(format: "stl" | "svg" | "pdf" | "json" | "layout") {
    if (!project || !reference || !(await buildAccess.allowed(reference)))
      throw Error("solid/access");
    await store.check(project);
    const guide = project.guide,
      stem = "solid-" + guide.sequenceHash.slice(0, 12);
    if (format === "stl")
      await download(
        stem + "-" + guide.parts[step - 1].id + ".stl",
        new Blob(
          [
            Uint8Array.from(
              solidStl(solidPartMesh(guide, step), guide.sequenceHash),
            ),
          ],
          { type: "model/stl" },
        ),
      );
    else if (format === "svg")
      await download(
        stem + "-" + guide.parts[step - 1].id + ".svg",
        solidTemplateSvg(guide, step),
        "image/svg+xml",
      );
    else if (format === "layout")
      await download(
        stem + "-assembly.svg",
        solidLayoutSvg(guide),
        "image/svg+xml",
      );
    else if (format === "json")
      await download(
        stem + ".json",
        JSON.stringify({ schema: "iprasm.solid-project/1", project }, null, 2),
      );
    else {
      const { solidPdf } = await import("./core/solid-pdf");
      await download(
        stem + ".pdf",
        new Blob(
          [Uint8Array.from(await solidPdf(guide, locale, project.confirmed))],
          { type: "application/pdf" },
        ),
      );
    }
  }
  const ranges = {
    widthMm: source.kind === "frame" ? [80, 600, 1] : [50, 300, 1],
    heightMm: source.kind === "frame" ? [80, 600, 1] : [50, 150, 1],
    clearanceMm: [0.2, 2, 0.1],
    wallMm: [4, 30, 1],
    thicknessMm: source.kind === "frame" ? [2, 20, 0.5] : [1, 10, 0.5],
    layers: [4, 40, 1],
    diameterMm: [30, 180, 1],
    layerMm: [1, 8, 0.5],
    boreMm: [2, 10, 0.1],
  };
  return (
    <section className="grid-studio card" data-testid="solid-studio">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <fieldset className="grid-fields" disabled={busy || loading}>
        <label>
          {t("kind")}
          <select
            aria-label={t("kind")}
            value={source.kind}
            onChange={(e) =>
              setSource({
                ...SOLID_DEFAULTS[e.target.value as SolidSource["kind"]],
              })
            }
          >
            {(["frame", "spindle", "letters"] as const).map((kind) => (
              <option value={kind} key={kind}>
                {t(kind)}
              </option>
            ))}
          </select>
        </label>
        {source.kind === "letters" && (
          <label>
            {t("text")}
            <input
              aria-label={t("text")}
              value={source.text}
              maxLength={32}
              dir="auto"
              onChange={(e) =>
                setSource((s) =>
                  s.kind === "letters" ? { ...s, text: e.target.value } : s,
                )
              }
            />
          </label>
        )}
        {Object.entries(source)
          .filter(([, value]) => typeof value === "number")
          .map(([rawKey, value]) => {
            const key = rawKey as keyof typeof ranges;
            return (
              <label key={key}>
                {t(key)}
                <input
                  aria-label={t(key)}
                  type="number"
                  min={ranges[key][0]}
                  max={ranges[key][1]}
                  step={ranges[key][2]}
                  value={value}
                  onChange={(e) =>
                    setSource((s) => ({ ...s, [key]: Number(e.target.value) }))
                  }
                />
              </label>
            );
          })}
        <button
          className="primary"
          onClick={() =>
            void run(async () => {
              const guide = await makeSolidPlan(source);
              await retain({
                id: crypto.randomUUID(),
                name: "3D",
                guide,
                confirmed: 0,
                revision: 0,
              });
            })
          }
        >
          {t("create")}
        </button>
        <label>
          {t("import")}
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void run(async () => {
                  if (file.size > 2_000_000) throw Error("solid/file");
                  const raw = JSON.parse(await file.text());
                  if (raw.schema !== "iprasm.solid-project/1")
                    throw Error("solid/file");
                  await store.check(raw.project);
                  await retain({
                    ...raw.project,
                    id: crypto.randomUUID(),
                    revision: 0,
                  });
                });
            }}
          />
        </label>
      </fieldset>
      {(busy || loading) && <p role="status">…</p>}
      {error && <p role="alert">{error}</p>}
      {g && project && (
        <div data-solid-plan={g.sequenceHash}>
          <SolidPreview plan={g} step={step} locale={locale} />
          <p>
            {t("parts")}: {g.parts.length} · {t("height")}:{" "}
            {Math.max(...g.parts.map((p) => p.zMm + p.heightMm))} mm
          </p>
          <p>
            {t(
              g.source.kind === "frame"
                ? "frameHelp"
                : g.source.kind === "spindle"
                  ? "spindleHelp"
                  : "lettersHelp",
            )}
          </p>
          <p>{t("physical")}</p>
          {!allowed ? (
            <CraftBuildGate
              reference={reference!}
              locale={locale}
              hint={t("access")}
              onUnlocked={() => setAllowedHash(g.sequenceHash)}
            />
          ) : (
            <>
              <p data-testid="solid-progress">
                {t("progress")}: {project.confirmed}/{g.parts.length}
              </p>
              <label>
                {t("step")}
                <input
                  aria-label={t("step")}
                  type="number"
                  min={1}
                  max={g.parts.length}
                  value={step}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= g.parts.length)
                      setStep(n);
                  }}
                />
              </label>
              <h2 data-testid="solid-current">
                {t("part")} {step} · {g.parts[step - 1].id}
              </h2>
              <CraftSpeechButton
                identity={g.sequenceHash + ":" + step}
                locale={locale}
                text={
                  solidText(baseLocale(locale), "part") +
                  " " +
                  craftNumber(locale, step) +
                  ". " +
                  solidText(baseLocale(locale), "dimensions") +
                  " " +
                  facts!.max
                    .map((v, c) =>
                      craftNumber(
                        locale,
                        Number((v - facts!.min[c]).toFixed(2)),
                      ),
                    )
                    .join(". ") +
                  ". " +
                  (baseLocale(locale) === "uz"
                    ? "millimetr"
                    : locale === "ru"
                      ? "миллиметров"
                      : "millimetres")
                }
              />
              <p>
                {t("dimensions")}:{" "}
                {facts!.max
                  .map((v, c) => (v - facts!.min[c]).toFixed(2))
                  .join(" × ")}{" "}
                mm · Z={g.parts[step - 1].zMm} mm
              </p>
              <div className="grid-actions">
                <button
                  disabled={busy || step === 1}
                  onClick={() => setStep((s) => s - 1)}
                >
                  {t("previous")}
                </button>
                <button
                  disabled={busy || step === g.parts.length}
                  onClick={() => setStep((s) => s + 1)}
                >
                  {t("next")}
                </button>
                <button
                  disabled={busy || step <= project.confirmed}
                  onClick={() =>
                    void run(async () => {
                      if (!(await buildAccess.allowed(reference!)))
                        throw Error("solid/access");
                      await retain(
                        {
                          ...project,
                          confirmed: step,
                          revision: project.revision + 1,
                        },
                        project.revision,
                      );
                    })
                  }
                >
                  {t("confirm")}
                </button>
              </div>
              <div className="grid-actions">
                {(
                  [
                    "stl",
                    "svg",
                    "json",
                    "pdf",
                    ...(g.source.kind !== "spindle" ? ["layout" as const] : []),
                  ] as const
                ).map((format) => (
                  <button
                    key={format}
                    disabled={busy}
                    onClick={() => void run(() => exported(format))}
                  >
                    {t(format)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <h2>{t("library")}</h2>
      {library.map((p) => (
        <div className="grid-actions" key={p.id}>
          <span>
            {p.guide.sequenceHash.slice(0, 8)} · {p.confirmed}/
            {p.guide.parts.length}
          </span>
          <button
            disabled={busy || loading}
            onClick={() =>
              void run(async () => {
                const fresh = await store.load(p.id);
                setLibrary(fresh.all);
                open(fresh.project);
              })
            }
          >
            {t("open")}
          </button>
          <button
            disabled={busy || loading}
            onClick={() =>
              void run(async () => {
                setLibrary(await store.remove(p.id, p.revision));
                if (project?.id === p.id) setProject(undefined);
              })
            }
          >
            {t("remove")}
          </button>
        </div>
      ))}
    </section>
  );
}
