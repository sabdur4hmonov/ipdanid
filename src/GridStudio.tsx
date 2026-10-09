import { useEffect, useRef, useState } from "react";
import { PhotoActions } from "./PhotoActions";
import { PersonBackground, type BackgroundState } from "./PersonBackground";
import { loadPhoto, sampleCanvas } from "./core/image";
import {
  generateGrid,
  dimensions,
  gridCounts,
  gridCell,
  gridFile,
  gridCsv,
  gridSvg,
  parseGridProject,
  newGridProject,
  replaceGridCell,
  type GridKind,
  type GridProject,
  type GridColor,
} from "./core/grid-craft";
import { readGridProjects, saveGridProject } from "./grid-storage";
import { gridText } from "./grid-i18n";
import { download } from "./download";
import type { Locale } from "./core/types";
import "./grid.css";
const COLORS = [
  "#faf8ef",
  "#18201d",
  "#888888",
  "#a43e40",
  "#d7a543",
  "#1e526f",
  "#3a7358",
  "#b99378",
  "#e8c7af",
  "#513e61",
  "#608fa4",
  "#cab8da",
];
const paletteText = (hexes: string[]) =>
  hexes.map((hex, index) => `C${index + 1},${hex},5000`).join("\n");
export function GridStudio({ locale }: { locale: Locale }) {
  const t = (key: Parameters<typeof gridText>[1]) => gridText(locale, key),
    [kind, setKind] = useState<GridKind>("mosaic"),
    [columns, setColumns] = useState(48),
    [rows, setRows] = useState(48),
    [pitch, setPitch] = useState(8),
    [spares, setSpares] = useState(0),
    [palette, setPalette] = useState(paletteText(COLORS)),
    [image, setImage] = useState<HTMLCanvasElement>(),
    [original, setOriginal] = useState<HTMLCanvasElement>(),
    [background, setBackground] = useState<BackgroundState>(),
    [backgroundBusy, setBackgroundBusy] = useState(false),
    [photoKey, setPhotoKey] = useState(0),
    [name, setName] = useState(""),
    [project, setProject] = useState<GridProject>(),
    [library, setLibrary] = useState<GridProject[]>([]),
    [ready, setReady] = useState(false),
    [step, setStep] = useState(1),
    [undo, setUndo] = useState<number>(),
    [replacement, setReplacement] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const preview = useRef<HTMLCanvasElement>(null),
    job = useRef(0);
  useEffect(() => {
    readGridProjects()
      .then((p) => {
        setLibrary(p);
        setReady(true);
      })
      .catch((e) => setError(e.message));
    return () => {
      job.current++;
    };
  }, []);
  useEffect(() => {
    const g = project?.guide,
      c = preview.current;
    if (!g || !c) return;
    c.width = g.columns * 8;
    c.height = g.rows * 8;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    g.cells.forEach((v, k) => {
      const x = (k % g.columns) * 8,
        y = Math.floor(k / g.columns) * 8;
      ctx.fillStyle = g.profile.palette[v].hex;
      if (g.profile.kind === "mosaic") ctx.fillRect(x, y, 8, 8);
      else {
        ctx.beginPath();
        ctx.arc(x + 4, y + 4, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [project]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(
        message.includes("Insufficient")
          ? t("insufficient")
          : message.includes("another window")
            ? t("conflict")
            : message,
      );
    } finally {
      setBusy(false);
    }
  }
  function open(p: GridProject) {
    setProject(p);
    setUndo(undefined);
    setStep(Math.min(p.guide.cells.length, p.progress.confirmed + 1));
    setReplacement(0);
    setError("");
  }
  async function importPhoto(file: File) {
    const token = ++job.current,
      bitmap = await loadPhoto(file);
    try {
      const c = document.createElement("canvas"),
        scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
      c.width = Math.round(bitmap.width * scale);
      c.height = Math.round(bitmap.height * scale);
      c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
      if (token === job.current) {
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
    dimensions(columns, rows);
    const colors: GridColor[] = palette
      .split(/\r?\n/)
      .filter((s) => s.trim())
      .map((s) => {
        const [code, hex, stock, ...extra] = s.split(",").map((s) => s.trim());
        if (extra.length || stock === "") throw Error(t("paletteHelp"));
        return { code, hex, stock: Number(stock) };
      });
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
      token = ++job.current,
      g = await generateGrid(pixels, columns, rows, {
        kind,
        pitchMm: pitch,
        sparePercent: spares,
        palette: colors,
        provisional: true,
      });
    if (token === job.current) open(newGridProject(g, name || t(kind)));
  }
  const cell = project ? gridCell(project.guide, step) : undefined;
  return (
    <section className="grid-studio">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <p>{t("materials")}</p>
      {error && (
        <p role="alert">
          {t("error")}: {error}
        </p>
      )}
      {busy && <p role="status">{t("busy")}</p>}
      <div className="grid-layout">
        <div className="card">
          <fieldset disabled={busy} className="grid-fields">
            <PhotoActions
              locale={locale}
              disabled={busy}
              uploadLabel={t("photo")}
              onPhoto={(file) => run(() => importPhoto(file))}
              hint={false}
            />
            <button
              className="chip"
              onClick={() => {
                job.current++;
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
                  job.current++;
                  setBackground(state);
                  setImage(prepared);
                }}
              />
            )}
            <p>{t("target")}</p>
            <label>
              {t("name")}
              <input
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t("kind")}
              <select
                aria-label={t("kind")}
                value={kind}
                onChange={(e) => {
                  const v = e.target.value as GridKind;
                  setKind(v);
                  setPitch(v === "mosaic" ? 8 : 2.5);
                  setSpares(v === "mosaic" ? 0 : 10);
                }}
              >
                <option value="mosaic">{t("mosaic")}</option>
                <option value="diamond">{t("diamond")}</option>
              </select>
            </label>
            {(
              [
                {
                  key: "columns",
                  value: columns,
                  set: setColumns,
                  min: 4,
                  max: 96,
                  step: 1,
                },
                {
                  key: "rows",
                  value: rows,
                  set: setRows,
                  min: 4,
                  max: 96,
                  step: 1,
                },
                {
                  key: "pitch",
                  value: pitch,
                  set: setPitch,
                  min: 1,
                  max: 20,
                  step: 0.1,
                },
                {
                  key: "spares",
                  value: spares,
                  set: setSpares,
                  min: 0,
                  max: 50,
                  step: 1,
                },
              ] as const
            ).map((f) => (
              <label key={f.key}>
                {t(f.key)}
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={f.value}
                  onChange={(e) => f.set(+e.target.value)}
                />
              </label>
            ))}
            <div className="grid-actions">
              <button
                onClick={() =>
                  setPalette(
                    paletteText([
                      "#ffffff",
                      "#d9d9d9",
                      "#b3b3b3",
                      "#808080",
                      "#595959",
                      "#333333",
                      "#111111",
                    ]),
                  )
                }
              >
                {t("mono")}
              </button>
              <button onClick={() => setPalette(paletteText(COLORS))}>
                {t("color")}
              </button>
            </div>
            <label>
              {t("palette")}
              <textarea
                aria-label={t("palette")}
                rows={12}
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
          {project && (
            <div className="card">
              <h2>{project.name}</h2>
              <p>{t("preview")}</p>
              <div className="grid-visual">
                <canvas
                  ref={preview}
                  data-grid-hash={project.guide.sequenceHash}
                  className="grid-preview"
                />
                <svg
                  className="grid-cursor"
                  viewBox={`0 0 ${project.guide.columns} ${project.guide.rows}`}
                  aria-hidden="true"
                >
                  <rect
                    x={cell!.column - 1}
                    y={cell!.row - 1}
                    width="1"
                    height="1"
                    fill="none"
                    stroke="#ee742e"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <p>
                {t("size")}:{" "}
                {(
                  project.guide.columns * project.guide.profile.pitchMm
                ).toFixed(2)}{" "}
                ×{" "}
                {(project.guide.rows * project.guide.profile.pitchMm).toFixed(
                  2,
                )}{" "}
                mm · {project.guide.columns} × {project.guide.rows}
              </p>
              <p>{t("order")}</p>
              <p data-testid="grid-progress">
                {t("progress")}: {project.progress.confirmed}/
                {project.guide.cells.length}
              </p>
              <label>
                {t("step")}
                <input
                  type="number"
                  min={1}
                  max={project.guide.cells.length}
                  value={step}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (
                      Number.isInteger(n) &&
                      n >= 1 &&
                      n <= project.guide.cells.length
                    )
                      setStep(n);
                  }}
                />
              </label>
              <p data-testid="grid-current">
                {cell!.step}. {t("row")} {cell!.row} · {t("column")}{" "}
                {cell!.column} ·{" "}
                <strong>
                  {cell!.symbol} {cell!.color.code}
                </strong>{" "}
                {cell!.color.hex}
              </p>
              <div className="grid-actions">
                <button
                  disabled={busy || step <= 1}
                  onClick={() => setStep((s) => s - 1)}
                >
                  {t("back")}
                </button>
                <button
                  disabled={busy || step >= project.guide.cells.length}
                  onClick={() => setStep((s) => s + 1)}
                >
                  {t("next")}
                </button>
                <button
                  disabled={
                    busy ||
                    !library.some((p) => p.id === project.id) ||
                    step <= project.progress.confirmed
                  }
                  onClick={() =>
                    void run(async () => {
                      const next = {
                          ...project,
                          progress: {
                            ...project.progress,
                            confirmed: step,
                            revision: project.progress.revision + 1,
                          },
                        },
                        all = await saveGridProject(
                          next,
                          project.progress.revision,
                        );
                      setLibrary(all);
                      setUndo(project.progress.confirmed);
                      setProject(next);
                      setStep(Math.min(next.guide.cells.length, step + 1));
                    })
                  }
                >
                  {t("confirmEnd")}
                </button>
                <button
                  disabled={
                    busy || !ready || library.some((p) => p.id === project.id)
                  }
                  onClick={() =>
                    void run(async () =>
                      setLibrary(await saveGridProject(project)),
                    )
                  }
                >
                  {t("save")}
                </button>
              </div>
              {undo !== undefined && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const next = {
                        ...project,
                        progress: {
                          ...project.progress,
                          confirmed: undo,
                          revision: project.progress.revision + 1,
                        },
                      };
                      setLibrary(
                        await saveGridProject(next, project.progress.revision),
                      );
                      setProject(next);
                      setStep(Math.min(next.guide.cells.length, undo + 1));
                      setUndo(undefined);
                    })
                  }
                >
                  {t("undo")}
                </button>
              )}
              {project.progress.confirmed === project.guide.cells.length && (
                <p>{t("finished")}</p>
              )}
              <details>
                <summary>{t("edit")}</summary>
                <p>{t("editHint")}</p>
                <label>
                  {t("replacement")}
                  <select
                    aria-label={t("replacement")}
                    value={replacement}
                    onChange={(e) => setReplacement(+e.target.value)}
                  >
                    {project.guide.profile.palette.map((c, j) => (
                      <option key={c.code} value={j}>
                        {c.code} {c.hex}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      open(
                        newGridProject(
                          await replaceGridCell(
                            project.guide,
                            cell!.index,
                            replacement,
                          ),
                          project.name + " +",
                        ),
                      ),
                    )
                  }
                >
                  {t("apply")}
                </button>
              </details>
              <details>
                <summary>{t("counts")}</summary>
                <div className="grid-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("palette")}</th>
                        <th>{t("used")}</th>
                        <th>{t("extra")}</th>
                        <th>{t("stock")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridCounts(project.guide).map((c) => (
                        <tr key={c.code}>
                          <td>
                            {c.code} {c.hex}
                          </td>
                          <td>{c.used}</td>
                          <td>{c.spares}</td>
                          <td>{c.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <p>{t("print")}</p>
              <div className="grid-actions">
                {(["json", "csv", "svg", "png", "pdf"] as const).map(
                  (format) => (
                    <button
                      key={format}
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const stem = `grid-${project.guide.sequenceHash.slice(0, 12)}`;
                          if (format === "json")
                            await download(stem + ".json", gridFile(project));
                          if (format === "csv")
                            await download(
                              stem + ".csv",
                              gridCsv(project.guide),
                              "text/csv",
                            );
                          if (format === "svg")
                            await download(
                              stem + ".svg",
                              gridSvg(project.guide),
                              "image/svg+xml",
                            );
                          if (format === "png")
                            await download(
                              stem + ".png",
                              await new Promise<Blob>((resolve, reject) =>
                                preview.current!.toBlob((b) =>
                                  b ? resolve(b) : reject(Error("PNG failed")),
                                ),
                              ),
                            );
                          if (format === "pdf") {
                            const { gridPdf } = await import("./core/grid-pdf");
                            await download(
                              stem + ".pdf",
                              new Blob(
                                [
                                  Uint8Array.from(
                                    await gridPdf(project, locale),
                                  ),
                                ],
                                { type: "application/pdf" },
                              ),
                            );
                          }
                        })
                      }
                    >
                      {t(format)}
                    </button>
                  ),
                )}
              </div>
              <code className="hash">{project.guide.sequenceHash}</code>
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
                  const p = await parseGridProject(await file.text()),
                    all = await saveGridProject(p);
                  setLibrary(all);
                  open(p);
                });
            }}
          />
        </label>
        {library.length === 0 && <p>{t("empty")}</p>}
        {library.map((p) => (
          <div key={p.id} className="grid-library-row">
            <span>
              {p.name} · {p.guide.columns}×{p.guide.rows} ·{" "}
              {p.progress.confirmed}/{p.guide.cells.length}
            </span>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const all = await readGridProjects();
                  setLibrary(all);
                  const latest = all.find((x) => x.id === p.id);
                  if (latest) open(latest);
                  else throw Error(t("reload"));
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
