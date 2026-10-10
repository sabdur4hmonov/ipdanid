import { useEffect, useRef, useState } from "react";
import { PhotoActions } from "./PhotoActions";
import { PersonBackground, type BackgroundState } from "./PersonBackground";
import { loadPhoto, sampleCanvas } from "./core/image";
import {
  checkPaintSettings,
  newPaintProject,
  parsePaintProject,
  paintFile,
  paintSvg,
  paintCsv,
  paintCoverage,
  validatePaint,
  type PaintColor,
  type PaintGuide,
  type PaintProject,
} from "./core/paint";
import { readPaintProjects, savePaintProject } from "./paint-storage";
import { paintText } from "./paint-i18n";
import { download } from "./download";
import type { Locale } from "./core/types";
import "./grid.css";
const DEFAULT_PALETTE = [
  "#ffffff",
  "#161a1d",
  "#72716e",
  "#bab1a6",
  "#edc7b0",
  "#ad7b64",
  "#88483c",
  "#354d67",
  "#55825c",
  "#d9ab43",
]
  .map((hex, k) => `C${k + 1},${hex}`)
  .join("\n");
export function PaintStudio({ locale }: { locale: Locale }) {
  const t = (k: Parameters<typeof paintText>[1]) => paintText(locale, k);
  const [columns, setColumns] = useState(64),
    [rows, setRows] = useState(64),
    [pitch, setPitch] = useState(4),
    [minimum, setMinimum] = useState(12),
    [palette, setPalette] = useState(DEFAULT_PALETTE),
    [name, setName] = useState(""),
    [image, setImage] = useState<HTMLCanvasElement>(),
    [original, setOriginal] = useState<HTMLCanvasElement>(),
    [background, setBackground] = useState<BackgroundState>(),
    [photoKey, setPhotoKey] = useState(0),
    [backgroundBusy, setBackgroundBusy] = useState(false),
    [project, setProject] = useState<PaintProject>(),
    [library, setLibrary] = useState<PaintProject[]>([]),
    [ready, setReady] = useState(false),
    [region, setRegion] = useState(0),
    [colored, setColored] = useState(false),
    [busy, setBusy] = useState(false),
    [generating, setGenerating] = useState(false),
    [error, setError] = useState(""),
    [undo, setUndo] = useState<number[]>();
  const token = useRef(0),
    worker = useRef<Worker | undefined>(undefined),
    cancelWait = useRef<(() => void) | undefined>(undefined),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    readPaintProjects()
      .then((p) => {
        if (mounted.current) {
          setLibrary(p);
          setReady(true);
        }
      })
      .catch((e) => {
        if (mounted.current) setError(e.message);
      });
    return () => {
      mounted.current = false;
      token.current++;
      worker.current?.terminate();
      cancelWait.current?.();
    };
  }, []);
  const cancel = () => {
    token.current++;
    worker.current?.terminate();
    worker.current = undefined;
    cancelWait.current?.();
    cancelWait.current = undefined;
    setGenerating(false);
  };
  const open = (p: PaintProject) => {
    setProject(p);
    setRegion(
      p.guide.regions.find((r) => !p.progress.completed.includes(r.id))?.id ??
        0,
    );
    setUndo(undefined);
    setError("");
  };
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (mounted.current) {
        const message = e instanceof Error ? e.message : String(e);
        setError(
          message.includes("another window")
            ? t("conflict")
            : message.includes("Invalid paint")
              ? t("invalid")
              : message,
        );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function importPhoto(file: File) {
    const job = ++token.current,
      bitmap = await loadPhoto(file);
    try {
      const c = document.createElement("canvas"),
        scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
      c.width = Math.max(1, Math.round(bitmap.width * scale));
      c.height = Math.max(1, Math.round(bitmap.height * scale));
      c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
      if (mounted.current && job === token.current) {
        setImage(c);
        setOriginal(c);
        setBackground(undefined);
        setPhotoKey((v) => v + 1);
        setBackgroundBusy(true);
        setName(file.name.replace(/\.[^.]+$/, ""));
      }
    } finally {
      bitmap.close();
    }
  }
  async function calculate() {
    if (!image || backgroundBusy) return;
    const colors: PaintColor[] = palette
      .split(/\r?\n/)
      .filter((s) => s.trim())
      .map((s) => {
        const [code, hex, ...extra] = s.split(",").map((s) => s.trim());
        if (extra.length) throw Error(t("paletteHelp"));
        return { code, hex };
      });
    checkPaintSettings(columns, rows, pitch, minimum, colors);
    const c = document.createElement("canvas");
    c.width = columns;
    c.height = rows;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, columns, rows);
    const scale = Math.min(columns / image.width, rows / image.height);
    ctx.drawImage(
      image,
      (columns - image.width * scale) / 2,
      (rows - image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
    const rgba = ctx.getImageData(0, 0, columns, rows).data,
      pixels = Uint8Array.from(
        { length: columns * rows * 3 },
        (_, k) => rgba[Math.floor(k / 3) * 4 + (k % 3)],
      ),
      job = ++token.current;
    setGenerating(true);
    try {
      const g = await new Promise<PaintGuide | undefined>((resolve, reject) => {
        const w = new Worker(new URL("./paint.worker.ts", import.meta.url), {
          type: "module",
        });
        worker.current = w;
        cancelWait.current = () => resolve(undefined);
        w.onmessage = ({ data }) => {
          if (data.error) reject(Error(data.error));
          else resolve(data.guide);
        };
        w.onerror = () => reject(Error(t("error")));
        w.postMessage(
          { pixels, columns, rows, pitch, minimum, palette: colors },
          [pixels.buffer],
        );
      });
      if (g) {
        const valid = await validatePaint(g);
        if (mounted.current && job === token.current)
          open(newPaintProject(valid, name || t("title")));
      }
    } finally {
      worker.current?.terminate();
      worker.current = undefined;
      cancelWait.current = undefined;
      if (mounted.current) setGenerating(false);
    }
  }
  async function update(completed: number[], remember = true) {
    if (!project) return;
    const next = {
      ...project,
      progress: {
        ...project.progress,
        completed: [...completed].sort((a, b) => a - b),
        revision: project.progress.revision + 1,
      },
    };
    setLibrary(await savePaintProject(next, project.progress.revision));
    if (remember) setUndo(project.progress.completed);
    setProject(next);
  }
  async function exportFile(format: "json" | "svg" | "csv" | "pdf") {
    if (!project) return;
    const stem = "paint-" + project.guide.sequenceHash.slice(0, 12);
    if (format === "json") await download(stem + ".json", paintFile(project));
    if (format === "svg")
      await download(stem + ".svg", paintSvg(project.guide), "image/svg+xml");
    if (format === "csv")
      await download(
        stem + ".csv",
        paintCsv(project.guide, project.progress.completed),
        "text/csv",
      );
    if (format === "pdf") {
      const { paintPdf } = await import("./core/paint-pdf");
      await download(
        stem + ".pdf",
        new Blob([Uint8Array.from(await paintPdf(project, locale))], {
          type: "application/pdf",
        }),
      );
    }
  }
  const current = project?.guide.regions[region],
    saved = library.some((p) => p.id === project?.id),
    g = project?.guide;
  return (
    <section className="grid-studio paint-studio">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      {error && (
        <p role="alert">
          {t("error")}: {error}
        </p>
      )}
      {generating && <p role="status">{t("busy")}</p>}
      {generating && <button onClick={cancel}>{t("cancel")}</button>}
      <div className="grid-layout">
        <div className="card">
          <fieldset className="grid-fields" disabled={busy}>
            <PhotoActions
              locale={locale}
              disabled={busy}
              uploadLabel={t("photo")}
              onPhoto={(file) => run(() => importPhoto(file))}
              hint={false}
            />
            <button
              onClick={() => {
                token.current++;
                setImage(sampleCanvas());
                setOriginal(undefined);
                setBackground(undefined);
                setBackgroundBusy(false);
                setName(t("sample"));
              }}
            >
              {t("sample")}
            </button>
            {original && (
              <PersonBackground
                key={photoKey}
                source={original}
                initial={background}
                locale={locale}
                onBusy={setBackgroundBusy}
                onChange={(state, prepared) => {
                  token.current++;
                  setBackground(state);
                  setImage(prepared);
                }}
              />
            )}
            <p>{t("fit")}</p>
            <label>
              {t("name")}
              <input
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {(
              [
                {
                  key: "columns",
                  value: columns,
                  set: setColumns,
                  min: 8,
                  max: 96,
                },
                { key: "rows", value: rows, set: setRows, min: 8, max: 96 },
                { key: "pitch", value: pitch, set: setPitch, min: 1, max: 10 },
                {
                  key: "minimum",
                  value: minimum,
                  set: setMinimum,
                  min: 1,
                  max: Math.min(256, columns * rows),
                },
              ] as const
            ).map((f) => (
              <label key={f.key}>
                {t(f.key)}
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.key === "pitch" ? 0.1 : 1}
                  value={f.value}
                  onChange={(e) => f.set(Number(e.target.value))}
                />
              </label>
            ))}
            <div className="grid-actions">
              <button onClick={() => setPalette(DEFAULT_PALETTE)}>
                {t("fullColor")}
              </button>
              <button
                onClick={() =>
                  setPalette(
                    [
                      "#ffffff",
                      "#d9d9d9",
                      "#b3b3b3",
                      "#808080",
                      "#595959",
                      "#333333",
                      "#111111",
                    ]
                      .map((hex, k) => `G${k + 1},${hex}`)
                      .join("\n"),
                  )
                }
              >
                {t("gray")}
              </button>
            </div>
            <label>
              {t("palette")}
              <textarea
                aria-label={t("palette")}
                rows={10}
                value={palette}
                onChange={(e) => setPalette(e.target.value)}
              />
            </label>
            <p>{t("paletteHelp")}</p>
            <button
              className="primary"
              disabled={!image || busy || backgroundBusy}
              onClick={() => void run(calculate)}
            >
              {t("calculate")}
            </button>
          </fieldset>
        </div>
        <div>
          {project && g && current && (
            <div className="card">
              <h2>{project.name}</h2>
              <label>
                <input
                  type="checkbox"
                  checked={colored}
                  onChange={(e) => setColored(e.target.checked)}
                />
                {t("preview")}
              </label>
              <div
                className="paint-preview"
                aria-label={t(colored ? "preview" : "outline")}
                dangerouslySetInnerHTML={{
                  __html: paintSvg(g, {
                    colored,
                    active: colored ? undefined : region,
                    completed: colored ? undefined : project.progress.completed,
                  }),
                }}
              />
              <p>
                {g.columns * g.pitchMm} × {g.rows * g.pitchMm} mm ·{" "}
                {g.regions.length} {t("region")}
              </p>
              {g.regions.some((r) => !r.labelFits) && (
                <p role="status">{t("missing")}</p>
              )}
              <p data-testid="paint-progress">
                {t("completed")}: {project.progress.completed.length}/
                {g.regions.length}
              </p>
              <label>
                {t("region")}
                <input
                  type="number"
                  min={1}
                  max={g.regions.length}
                  value={region + 1}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= g.regions.length)
                      setRegion(n - 1);
                  }}
                />
              </label>
              <p data-testid="paint-current">
                {t("region")} {region + 1} · {t("color")} {current.color + 1} (
                {g.palette[current.color].code} {g.palette[current.color].hex})
                · {t("area")}{" "}
                {((current.cells.length * g.pitchMm ** 2) / 100).toFixed(2)}
              </p>
              <p>
                {t("position")}:{" "}
                {(((current.anchor % g.columns) + 0.5) * g.pitchMm).toFixed(1)},{" "}
                {(
                  (Math.floor(current.anchor / g.columns) + 0.5) *
                  g.pitchMm
                ).toFixed(1)}{" "}
                · {t("label")}: {t(current.labelFits ? "yes" : "no")}
              </p>
              <div className="grid-actions">
                <button
                  disabled={busy || region === 0}
                  onClick={() => setRegion((v) => v - 1)}
                >
                  {t("previous")}
                </button>
                <button
                  disabled={busy || region === g.regions.length - 1}
                  onClick={() => setRegion((v) => v + 1)}
                >
                  {t("next")}
                </button>
                <button
                  disabled={busy || !ready || saved}
                  onClick={() =>
                    void run(async () =>
                      setLibrary(await savePaintProject(project)),
                    )
                  }
                >
                  {t("save")}
                </button>
                <button
                  disabled={busy || !saved}
                  onClick={() =>
                    void run(() =>
                      update(
                        project.progress.completed.includes(region)
                          ? project.progress.completed.filter(
                              (v) => v !== region,
                            )
                          : [...project.progress.completed, region],
                      ),
                    )
                  }
                >
                  {t(
                    project.progress.completed.includes(region)
                      ? "unconfirm"
                      : "confirm",
                  )}
                </button>
                {undo && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await update(undo, false);
                        setUndo(undefined);
                      })
                    }
                  >
                    {t("undo")}
                  </button>
                )}
              </div>
              {project.progress.completed.length === g.regions.length && (
                <p>{t("finished")}</p>
              )}
              <details>
                <summary>{t("coverage")}</summary>
                <div className="grid-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("color")}</th>
                        <th>{t("palette")}</th>
                        <th>{t("area")}</th>
                        <th>{t("region")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paintCoverage(g).map((c) => (
                        <tr key={c.code}>
                          <td>{c.number}</td>
                          <td>
                            {c.code} {c.hex}
                          </td>
                          <td>{c.areaCm2.toFixed(2)}</td>
                          <td>{c.regions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <p>{t("physical")}</p>
              <p>{t("print")}</p>
              <div className="grid-actions">
                {(["json", "svg", "csv", "pdf"] as const).map((format) => (
                  <button
                    disabled={busy}
                    key={format}
                    onClick={() => void run(() => exportFile(format))}
                  >
                    {t(format)}
                  </button>
                ))}
              </div>
              <code>{g.sequenceHash}</code>
            </div>
          )}
        </div>
      </div>
      <section className="card">
        <h2>{t("library")}</h2>
        <label>
          {t("import")}
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy || !ready}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void run(async () => {
                  if (file.size > 2_000_000) throw Error(t("fileLimit"));
                  const p = await parsePaintProject(await file.text());
                  setLibrary(await savePaintProject(p));
                  open(p);
                });
            }}
          />
        </label>
        {!library.length && <p>{t("empty")}</p>}
        {library.map((p) => (
          <div className="grid-library-row" key={p.id}>
            <span>
              {p.name} · {p.progress.completed.length}/{p.guide.regions.length}
            </span>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const all = await readPaintProjects();
                  setLibrary(all);
                  const latest = all.find((v) => v.id === p.id);
                  if (latest) open(latest);
                })
              }
            >
              {t("resume")}
            </button>
          </div>
        ))}
      </section>
    </section>
  );
}
