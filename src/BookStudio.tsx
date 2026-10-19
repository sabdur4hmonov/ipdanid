import { useEffect, useState } from "react";
import {
  DEFAULT_BOOK,
  makeBookPlan,
  validateBookPlan,
  bookElevationSvg,
  bookLeafSvg,
  bookCsv,
  type BookParams,
  type BookPlan,
} from "./core/book-folding";
import { localCraftStore, type CraftProject } from "./local-craft-store";
import { buildAccess, type BuildAccessReference } from "./build-access";
import { CraftBuildGate } from "./CraftBuildGate";
import { bookText } from "./book-i18n";
import type { Locale } from "./core/types";
import { download } from "./download";
import { CraftSpeechButton } from "./CraftSpeechButton";
import { craftNumber } from "./craft-voice";
import { baseLocale } from "./uzbek-script";
const store = localCraftStore("book", validateBookPlan, (g) => g.leaves.length);
function SvgImage({ svg, label }: { svg: string; label: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml" }),
    );
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [svg]);
  return (
    <img
      src={url || undefined}
      alt={label}
      style={{
        maxWidth: "100%",
        width: 360,
        maxHeight: 500,
        objectFit: "contain",
      }}
    />
  );
}
export default function BookStudio({ locale }: { locale: Locale }) {
  const [params, setParams] = useState({ ...DEFAULT_BOOK }),
    [kind, setKind] = useState<"heart" | "text">("heart"),
    [text, setText] = useState("ALI"),
    [project, setProject] = useState<CraftProject<BookPlan>>(),
    [library, setLibrary] = useState<CraftProject<BookPlan>[]>([]),
    [step, setStep] = useState(1),
    [allowedHash, setAllowedHash] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const t = (key: Parameters<typeof bookText>[1]) => bookText(locale, key),
    g = project?.guide,
    leaf = g?.leaves[step - 1],
    allowed = !!g && allowedHash === g.sequenceHash;
  const reference: BuildAccessReference | undefined = g
    ? { sequenceHash: g.sequenceHash, params: { accessPolicy: g.accessPolicy } }
    : undefined;
  async function run(fn: () => Promise<void>) {
    if (busy) return;
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
            : message.includes("book/leaves")
              ? "shortage"
              : message.includes("limit")
                ? "limit"
                : "error",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void run(async () => setLibrary(await store.read()));
  }, []);
  useEffect(() => {
    let live = true;
    setAllowedHash("");
    const refresh = () => {
      if (reference)
        void buildAccess.allowed(reference).then((ok) => {
          if (live) setAllowedHash(ok ? reference.sequenceHash : "");
        });
    };
    refresh();
    window.addEventListener("iprasm-build-access", refresh);
    return () => {
      live = false;
      window.removeEventListener("iprasm-build-access", refresh);
    };
  }, [g?.sequenceHash]);
  function open(p: CraftProject<BookPlan>) {
    setProject(p);
    setParams({ ...p.guide.params });
    setKind(p.guide.source.kind);
    if (p.guide.source.kind === "text") setText(p.guide.source.text);
    setStep(Math.min(p.guide.leaves.length, p.confirmed + 1));
  }
  async function retain(p: CraftProject<BookPlan>, expected?: number) {
    setLibrary(await store.save(p, expected));
    open(p);
  }
  async function exportFile(format: "json" | "csv" | "svg" | "pdf") {
    if (!project || !reference || !(await buildAccess.allowed(reference)))
      throw Error("book/access");
    await store.check(project);
    const stem = "book-" + project.guide.sequenceHash.slice(0, 12);
    if (format === "pdf") {
      const { bookPdf } = await import("./core/book-pdf");
      await download(
        stem + ".pdf",
        new Blob([Uint8Array.from(await bookPdf(project.guide, locale))], {
          type: "application/pdf",
        }),
      );
    } else if (format === "json")
      await download(
        stem + ".json",
        JSON.stringify({ schema: "iprasm.book-project/1", project }, null, 2),
      );
    else if (format === "csv")
      await download(
        stem + ".csv",
        bookCsv(project.guide),
        "text/csv;charset=utf-8",
      );
    else
      await download(
        stem + "-leaf-" + step + ".svg",
        bookLeafSvg(project.guide, step),
        "image/svg+xml",
      );
  }
  const fields: [
    keyof BookParams,
    Parameters<typeof bookText>[1],
    number,
    number,
    number,
  ][] = [
    ["pageWidthMm", "width", 80, 300, 1],
    ["pageHeightMm", "height", 120, 400, 1],
    ["availableLeaves", "leaves", 40, 1000, 1],
    ["artWidthMm", "artWidth", 50, 580, 1],
    ["artHeightMm", "artHeight", 40, 380, 1],
    ["columns", "columns", 32, 160, 1],
    ["rows", "rows", 32, 160, 1],
    ["spineMarginMm", "margin", 5, 100, 1],
    ["insetMm", "inset", 5, 100, 1],
    ["paperThicknessMm", "paper", 0.05, 0.3, 0.01],
  ];
  return (
    <section className="grid-studio card" data-testid="book-studio">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <fieldset className="grid-fields" disabled={busy}>
        <label>
          {t("source")}
          <select
            aria-label={t("source")}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="heart">{t("heart")}</option>
            <option value="text">{t("text")}</option>
          </select>
        </label>
        {kind === "text" && (
          <label>
            {t("text")}
            <input
              aria-label={t("text")}
              value={text}
              maxLength={24}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        )}
        <details>
          <summary>
            {t("width")} · {t("leaves")}
          </summary>
          {fields.map(([key, label, min, max, increment]) => (
            <label key={key}>
              {t(label)}
              <input
                aria-label={t(label)}
                type="number"
                min={min}
                max={max}
                step={increment}
                value={params[key]}
                onChange={(e) =>
                  setParams((p) => ({ ...p, [key]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </details>
        <button
          className="primary"
          onClick={() =>
            void run(async () => {
              const guide = await makeBookPlan(
                kind === "heart"
                  ? { kind: "heart" }
                  : { kind: "text", text: text.trim().normalize("NFC") },
                params,
              );
              await retain({
                id: crypto.randomUUID(),
                name: "Book",
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
                  if (file.size > 2_000_000) throw Error("book/file");
                  const raw = JSON.parse(await file.text());
                  if (raw.schema !== "iprasm.book-project/1")
                    throw Error("book/file");
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
      {error && <p role="alert">{error}</p>}
      {g && project && (
        <div data-book-hash={g.sequenceHash}>
          <SvgImage svg={bookElevationSvg(g)} label={t("title")} />
          <p>
            {t("used")}: {g.leaves.length}/{g.params.availableLeaves} ·{" "}
            {t("start")}: {g.startLeaf} · {t("lane")}: {g.lanes}
          </p>
          <p>{t("physical")}</p>
          {!allowed ? (
            <CraftBuildGate
              reference={reference!}
              locale={locale}
              onUnlocked={() => setAllowedHash(g.sequenceHash)}
            />
          ) : (
            leaf && (
              <>
                <p data-testid="book-progress">
                  {t("progress")}: {project.confirmed}/{g.leaves.length}
                </p>
                <label>
                  {t("step")}
                  <input
                    aria-label={t("step")}
                    type="number"
                    min={1}
                    max={g.leaves.length}
                    value={step}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 1 && n <= g.leaves.length)
                        setStep(n);
                    }}
                  />
                </label>
                <h2 data-testid="book-current">
                  {t("leaf")} {leaf.leaf} · {t("face")} {leaf.pageFace}
                </h2>
                <CraftSpeechButton
                  identity={g.sequenceHash + ":" + step}
                  locale={locale}
                  text={
                    bookText(baseLocale(locale), "leaf") +
                    " " +
                    craftNumber(locale, leaf.leaf) +
                    ". " +
                    (leaf.band
                      ? `${bookText(baseLocale(locale), "top")} ${craftNumber(locale, leaf.band[0])}. ${bookText(baseLocale(locale), "bottom")} ${craftNumber(locale, leaf.band[1])}. ${bookText(baseLocale(locale), "edge")} ${craftNumber(locale, g.params.pageWidthMm - leaf.top!.crease[1][0])}. ${craftNumber(locale, g.params.pageWidthMm - leaf.bottom!.crease[1][0])}.`
                      : bookText(baseLocale(locale), "blank") +
                        " " +
                        craftNumber(locale, g.params.insetMm)) +
                    " " +
                    (baseLocale(locale) === "uz"
                      ? "millimetr"
                      : locale === "ru"
                        ? "миллиметров"
                        : "millimetres")
                  }
                />
                {leaf.band ? (
                  <>
                    <p>
                      {t("top")}: {leaf.band[0]} mm · {t("bottom")}:{" "}
                      {leaf.band[1]} mm
                    </p>
                    <p>
                      {t("edge")}:{" "}
                      {(g.params.pageWidthMm - leaf.top!.crease[1][0]).toFixed(
                        1,
                      )}{" "}
                      /{" "}
                      {(
                        g.params.pageWidthMm - leaf.bottom!.crease[1][0]
                      ).toFixed(1)}{" "}
                      mm
                    </p>
                  </>
                ) : (
                  <p>
                    {t("blank")}: {g.params.insetMm} mm
                  </p>
                )}
                <SvgImage svg={bookLeafSvg(g, step)} label={t("svg")} />
                <div className="grid-actions">
                  <button
                    disabled={busy || step === 1}
                    onClick={() => setStep((s) => s - 1)}
                  >
                    {t("previous")}
                  </button>
                  <button
                    disabled={busy || step === g.leaves.length}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    {t("next")}
                  </button>
                  <button
                    disabled={busy || step <= project.confirmed}
                    onClick={() =>
                      void run(async () => {
                        if (!(await buildAccess.allowed(reference!)))
                          throw Error("book/access");
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
                  {(["json", "csv", "svg", "pdf"] as const).map((format) => (
                    <button
                      key={format}
                      disabled={busy}
                      onClick={() => void run(() => exportFile(format))}
                    >
                      {t(format)}
                    </button>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}
      <h2>{t("library")}</h2>
      {library.map((p) => (
        <div className="grid-actions" key={p.id}>
          <span>
            {p.guide.sequenceHash.slice(0, 8)} · {p.confirmed}/
            {p.guide.leaves.length}
          </span>
          <button
            disabled={busy}
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
            disabled={busy}
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
