import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import {
  drawQrCraft,
  makeQrCraft,
  qrCraftCsv,
  qrCraftSvg,
  validateQrCraft,
  type QrCraft,
} from "./core/qr-craft";
import { localCraftStore, type CraftProject } from "./local-craft-store";
import { qrCraftText } from "./qr-craft-i18n";
import { download } from "./download";
const store = localCraftStore("qr", validateQrCraft, (g) => g.moves.length);
export default function QrCraftStudio({ locale }: { locale: Locale }) {
  const [payload, setPayload] = useState("IP RASM 2026"),
    [project, setProject] = useState<CraftProject<QrCraft>>(),
    [library, setLibrary] = useState<CraftProject<QrCraft>[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [step, setStep] = useState(1),
    [back, setBack] = useState(false),
    [partial, setPartial] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    t = (key: Parameters<typeof qrCraftText>[1]) => qrCraftText(locale, key),
    g = project?.guide,
    current = g?.moves[step - 1];
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
    if (canvas.current && g)
      drawQrCraft(
        canvas.current.getContext("2d")!,
        g,
        partial ? project!.confirmed : g.moves.length,
        back,
      );
  }, [project, partial, back]);
  function open(p: CraftProject<QrCraft>) {
    setProject(p);
    setPayload(p.guide.payload);
    setStep(Math.min(p.guide.moves.length, p.confirmed + 1));
    setBack(false);
    setPartial(false);
  }
  async function retain(p: CraftProject<QrCraft>, expected?: number) {
    setLibrary(await store.save(p, expected));
    open(p);
  }
  async function exportFile(
    format: "json" | "csv" | "svg" | "template" | "pdf",
  ) {
    if (!project) return;
    await store.check(project);
    const stem = "qr-" + project.guide.sequenceHash.slice(0, 12);
    if (format === "pdf") {
      const { qrCraftPdf } = await import("./core/qr-craft-pdf");
      await download(
        stem + ".pdf",
        new Blob([Uint8Array.from(await qrCraftPdf(project.guide, locale))], {
          type: "application/pdf",
        }),
      );
    } else if (format === "json")
      await download(
        stem + ".json",
        JSON.stringify({ schema: "iprasm.qr-project/1", project }, null, 2),
      );
    else if (format === "csv")
      await download(
        stem + ".csv",
        qrCraftCsv(project.guide),
        "text/csv;charset=utf-8",
      );
    else
      await download(
        stem + (format === "template" ? "-holes" : "") + ".svg",
        qrCraftSvg(project.guide, format === "template"),
        "image/svg+xml",
      );
  }
  return (
    <section className="card grid-studio qr-craft" data-testid="qr-craft">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <fieldset className="grid-fields" disabled={busy}>
        <label>
          {t("payload")}
          <textarea
            aria-label={t("payload")}
            maxLength={80}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </label>
        <button
          className="primary"
          onClick={() =>
            void run(async () => {
              const guide = await makeQrCraft(payload);
              await retain({
                id: crypto.randomUUID(),
                name: "QR",
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
                  if (file.size > 1_600_000) throw Error("qr/file");
                  const raw = JSON.parse(await file.text());
                  if (raw.schema !== "iprasm.qr-project/1")
                    throw Error("qr/file");
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
      {g && project && current && (
        <>
          <canvas
            ref={canvas}
            width={1000}
            height={1000}
            className="grid-preview"
            aria-label={t("svg")}
            data-qr-hash={g.sequenceHash}
          />
          <p>
            {g.widthMm} × {g.widthMm} mm · {t("holes")}: {g.holes.length} ·{" "}
            {g.threadMetres} m
          </p>
          <p>{t("physical")}</p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={back}
              onChange={(e) => setBack(e.target.checked)}
            />
            {t("back")}
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
            />
            {t("partial")}
          </label>
          <p data-testid="qr-progress">
            {t("completed")}: {project.confirmed}/{g.moves.length} ·{" "}
            {((100 * project.confirmed) / g.moves.length).toFixed(1)}%
          </p>
          <label>
            {t("step")}
            <input
              type="number"
              min={1}
              max={g.moves.length}
              value={step}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 1 && n <= g.moves.length)
                  setStep(n);
              }}
            />
          </label>
          <p data-testid="qr-current">
            <strong>
              P{current.from + 1} → P{current.to + 1} · {t(current.side)}
            </strong>
            <br />
            {g.holes[current.from].x}, {g.holes[current.from].y} mm →{" "}
            {g.holes[current.to].x}, {g.holes[current.to].y} mm
          </p>
          <div className="grid-actions">
            <button
              disabled={busy || step === 1}
              onClick={() => setStep((s) => s - 1)}
            >
              {t("previous")}
            </button>
            <button
              disabled={busy || step === g.moves.length}
              onClick={() => setStep((s) => s + 1)}
            >
              {t("next")}
            </button>
            <button
              disabled={busy || step <= project.confirmed}
              onClick={() =>
                void run(async () => {
                  const p = {
                    ...project,
                    confirmed: step,
                    revision: project.revision + 1,
                  };
                  await retain(p, project.revision);
                })
              }
            >
              {t("confirm")}
            </button>
          </div>
          <div className="grid-actions">
            {(["json", "csv", "svg", "template", "pdf"] as const).map(
              (format) => (
                <button
                  key={format}
                  disabled={busy}
                  onClick={() => void run(() => exportFile(format))}
                >
                  {t(format)}
                </button>
              ),
            )}
          </div>
        </>
      )}
      <h2>{t("library")}</h2>
      {library.map((p) => (
        <div className="grid-actions" key={p.id}>
          <span>
            {p.guide.sequenceHash.slice(0, 8)} · {p.confirmed}/
            {p.guide.moves.length}
          </span>
          <button disabled={busy} onClick={() => open(p)}>
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
