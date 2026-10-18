import { AssemblyFocus } from "../AssemblyFocus";
import { lazy, Suspense } from "react";
const SequenceAnimation = lazy(() => import("../SequenceAnimation"));
import type { AppScreenContext } from "../useAppController";
import { pinLabel, sectorPin } from "../core/standard-kit";
import { recordedVoiceText } from "../recorded-voice-i18n";
type ScreenContext = Pick<
  AppScreenContext,
  | "ArrowRight"
  | "AssemblyNavigator"
  | "BuildGate"
  | "Check"
  | "Download"
  | "Layers"
  | "Pause"
  | "Play"
  | "Preview"
  | "RotateCcw"
  | "Supply"
  | "active"
  | "assemblyEffort"
  | "businessText"
  | "canBuild"
  | "chosenVoice"
  | "confirm"
  | "confirmCurrent"
  | "confirmedUndo"
  | "current"
  | "download"
  | "drag"
  | "guideLocale"
  | "instruction"
  | "jump"
  | "loaded"
  | "localSaveState"
  | "locale"
  | "matchingVoices"
  | "nav"
  | "pace"
  | "pan"
  | "paper"
  | "pause"
  | "pdf"
  | "pdfBusy"
  | "pinQuery"
  | "pins"
  | "playing"
  | "project"
  | "projectFile"
  | "renderInstruction"
  | "setConfirmedUndo"
  | "setError"
  | "setGuideLocale"
  | "setPace"
  | "setPan"
  | "setPaper"
  | "setPinQuery"
  | "setPins"
  | "setPlaying"
  | "setProjects"
  | "setSound"
  | "setSpeechRate"
  | "setTextSize"
  | "setVoiceEnabled"
  | "setVoiceIndex"
  | "setVolume"
  | "setZoom"
  | "sound"
  | "speak"
  | "speechRate"
  | "steps"
  | "t"
  | "textSize"
  | "toTxt"
  | "voiceEnabled"
  | "voiceIndex"
  | "volume"
  | "zoom"
>;
export function AssembleScreen({ context }: { context: ScreenContext }) {
  const {
    ArrowRight,
    AssemblyNavigator,
    BuildGate,
    Check,
    Download,
    Layers,
    Pause,
    Play,
    Preview,
    RotateCcw,
    Supply,
    active,
    assemblyEffort,
    businessText,
    canBuild,
    chosenVoice,
    confirm,
    confirmCurrent,
    confirmedUndo,
    current,
    download,
    drag,
    guideLocale,
    instruction,
    jump,
    loaded,
    localSaveState,
    locale,
    matchingVoices,
    nav,
    pace,
    pan,
    paper,
    pause,
    pdf,
    pdfBusy,
    pinQuery,
    pins,
    playing,
    project,
    projectFile,
    renderInstruction,
    setConfirmedUndo,
    setError,
    setGuideLocale,
    setPace,
    setPan,
    setPaper,
    setPinQuery,
    setPins,
    setPlaying,
    setProjects,
    setSound,
    setSpeechRate,
    setTextSize,
    setVoiceEnabled,
    setVoiceIndex,
    setVolume,
    setZoom,
    sound,
    speak,
    speechRate,
    steps,
    t,
    textSize,
    toTxt,
    voiceEnabled,
    voiceIndex,
    volume,
    zoom,
  } = context;
  return !instruction || !project ? (
    <div className="empty-page">
      <Layers size={36} />
      <h1>{t("assemble")}</h1>
      <p>{t("noProject")}</p>
      <button className="primary" onClick={() => nav("create")}>
        {t("create")}
      </button>
    </div>
  ) : !canBuild(instruction) ? (
    <BuildGate
      instruction={instruction}
      locale={locale}
      preview={<Preview instruction={instruction} />}
      onBuy={() => nav("customer")}
    />
  ) : (
    <>
      <section className="intro">
        <div className="truncate">
          <div className="eyebrow">{t("assemble")}</div>
          <h1>{project.name}</h1>
          <p>
            {t("local")} · {t("lastSaved")}{" "}
            {new Date(project.progress.updatedAt).toLocaleTimeString(locale)}
          </p>
        </div>
        <button
          className="outline"
          disabled={pdfBusy}
          onClick={() => void pdf()}
        >
          <Download size={16} />
          {pdfBusy ? "…" : t("exportPdf")}
        </button>
      </section>
      <AssemblyFocus
        instruction={instruction}
        current={current}
        confirmed={project.progress.confirmed}
        pace={pace}
        locale={locale}
        disabled={!loaded}
        saveState={localSaveState}
        onJump={jump}
        onConfirm={confirmCurrent}
      />
      <div className="craft-grid">
        <section className="card craft-preview">
          <Supply instruction={instruction} locale={locale} />
          <div
            className="craft-canvas"
            style={{
              aspectRatio:
                instruction.profile.widthMm / instruction.profile.heightMm,
            }}
            onPointerDown={(e) => {
              drag.current = {
                x: e.clientX - pan.x,
                y: e.clientY - pan.y,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current)
                setPan({
                  x: e.clientX - drag.current.x,
                  y: e.clientY - drag.current.y,
                });
            }}
            onPointerUp={() => (drag.current = null)}
          >
            <div
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
              }}
            >
              <Preview
                instruction={instruction}
                step={current}
                completed={project.progress.confirmed}
                pins={pins}
              />
            </div>
          </div>
          <div className="preview-tools">
            <label>
              {t("zoom")}
              <input
                aria-label={t("zoom")}
                type="range"
                min="1"
                max="3"
                step=".1"
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </label>
            <button
              className="text-button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw size={15} />
            </button>
            <label className="check-label">
              <input
                type="checkbox"
                checked={pins}
                onChange={(e) => setPins(e.target.checked)}
              />
              {t("pinLabels")}
            </label>
          </div>
          <p className="fineprint">{t("provisional")}</p>
          {instruction.profile.pinLayout && (
            <p data-testid="board-layout">
              {t("layoutNotice")}{" "}
              {instruction.profile.pinLayout.phaseDegreesClockwise}° ·{" "}
              {instruction.profile.pinLayout.version}
            </p>
          )}
          <code className="hash" data-testid="player-hash">
            {instruction.sequenceHash}
          </code>
        </section>
        <section className="card craft-controls">
          <div className="section-label">
            {t("announced")}{" "}
            <span>
              {current}/{steps.length}
            </span>
          </div>
          <div className="pin-route">
            <span>
              <small>{t("from")}</small>
              {active ? pinLabel(instruction.profile, active.from) : ""}
            </span>
            <ArrowRight size={27} />
            <span>
              <small>{t("to")}</small>
              {active ? pinLabel(instruction.profile, active.to) : ""}
            </span>
          </div>
          <div className="thread-color">
            <i style={{ background: active?.color }} />
            {active?.color}
          </div>
          {active?.segmentStart && (
            <p className="instruction-note">
              {t(active.segment === 0 ? "startKnot" : "colorChange")}
            </p>
          )}
          <div className="player-buttons">
            <button
              className="outline"
              disabled={current <= 1}
              onClick={() => jump(current - 1)}
            >
              {t("previous")}
            </button>
            <button
              className="primary icon-only"
              aria-label={playing ? t("pause") : t("play")}
              onClick={() => {
                if (playing) pause();
                else {
                  setPlaying(true);
                  speak();
                }
              }}
            >
              {playing ? <Pause /> : <Play />}
            </button>
            <button
              className="outline"
              disabled={current >= steps.length}
              onClick={() => jump(current + 1)}
            >
              {t("next")}
            </button>
          </div>
          <button
            className="primary full"
            disabled={!loaded}
            onClick={confirmCurrent}
          >
            <Check size={18} />
            {t("confirm")}
          </button>
          <div className="confirmed">
            <span>{t("confirmed")}</span>
            <strong data-testid="confirmed-step">
              {project.progress.confirmed}/{steps.length}
            </strong>
            <progress max={steps.length} value={project.progress.confirmed} />
          </div>
          <button
            className="text-button"
            disabled={confirmedUndo === null}
            onClick={() => {
              if (confirmedUndo !== null) {
                setProjects((ps) =>
                  ps.map((p) =>
                    p.id === project.id
                      ? {
                          ...p,
                          progress: confirm(
                            p.progress,
                            confirmedUndo,
                            p.instruction,
                          ),
                        }
                      : p,
                  ),
                );
                setConfirmedUndo(null);
              }
            }}
          >
            {t("undo")}
          </button>
          <p className="fineprint">
            {Math.ceil(
              assemblyEffort(instruction, pace).estimatedMinutes -
                (project.progress.confirmed * pace) / 60,
            )}{" "}
            {t("minutes")} {t("remaining")}
          </p>
          <p className="fineprint">
            {t("assemblyEstimateHint")} {pace} s. {t("remainingKnotsHint")}
          </p>
          <label className="field-label" htmlFor="jump">
            {t("jump")}
          </label>
          <input
            id="jump"
            type="number"
            min="1"
            max={steps.length}
            value={current}
            onChange={(e) => jump(+e.target.value)}
          />
          <label className="field-label" htmlFor="pace">
            {t("pace")}
          </label>
          <input
            id="pace"
            type="number"
            min="2"
            max="120"
            value={pace}
            onChange={(e) =>
              setPace(Math.max(2, Math.min(120, +e.target.value)))
            }
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={voiceEnabled}
              disabled={!chosenVoice}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
            />
            {t("voice")}
          </label>
          <label>
            {businessText(locale, "guideLanguage")}
            <select
              aria-label={businessText(locale, "guideLanguage")}
              value={guideLocale}
              onChange={(e) =>
                setGuideLocale(e.target.value as "uz" | "ru" | "en")
              }
            >
              <option value="uz">O‘zbekcha</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          {!chosenVoice ? (
            <p className="fineprint">{t("noVoice")}</p>
          ) : (
            <>
              <select
                aria-label={t("voice")}
                value={voiceIndex}
                onChange={(e) => setVoiceIndex(+e.target.value)}
              >
                {matchingVoices.map((v, j) => (
                  <option key={`${v.name}-${j}`} value={j}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <label className="range-label">
                <span>{t("speechSpeed")}</span>
                <input
                  type="range"
                  min=".5"
                  max="1.5"
                  step=".1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(+e.target.value)}
                />
              </label>
              <button className="text-button" onClick={speak}>
                {t("repeat")}
              </button>
            </>
          )}
          <p className="fineprint" data-testid="recorded-voice-availability">
            {recordedVoiceText(
              locale,
              matchingVoices.some((v) => v.recorded) ? "available" : "missing",
            )}
            {matchingVoices.some((v) => v.recorded)
              ? `: ${matchingVoices.filter((v) => v.recorded).length}`
              : ""}
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
            />
            {t("sound")}
          </label>
          {sound && (
            <label className="range-label">
              <span>{t("volume")}</span>
              <input
                type="range"
                min="0"
                max=".2"
                step=".01"
                value={volume}
                onChange={(e) => setVolume(+e.target.value)}
              />
            </label>
          )}
        </section>
      </div>
      <AssemblyNavigator
        project={project}
        current={current}
        locale={locale}
        disabled={!loaded}
        onJump={jump}
        onChange={(bookmarks) =>
          setProjects((ps) =>
            ps.map((p) => (p.id === project.id ? { ...p, bookmarks } : p)),
          )
        }
      />
      <div className="card recovery">
        <h2>{t("pinSearch")}</h2>
        <input
          aria-label={t("pinSearch")}
          type={instruction.profile.standardKit ? "text" : "number"}
          min="0"
          max={instruction.profile.pins.length - 1}
          value={pinQuery}
          onChange={(e) => setPinQuery(e.target.value)}
        />
        <p>{t("occurrences")}</p>
        <div className="occurrences">
          {pinQuery !== "" &&
            steps
              .filter(
                (s) =>
                  s.from === sectorPin(instruction.profile, pinQuery) ||
                  s.to === sectorPin(instruction.profile, pinQuery),
              )
              .map((s) => (
                <button
                  className="chip"
                  key={s.index}
                  onClick={() => jump(s.index)}
                >
                  {s.index}: {s.fromLabel ?? s.from} → {s.toLabel ?? s.to}
                </button>
              ))}
        </div>
        <details>
          <summary>{t("repair")}</summary>
          <p>{t("startKnot")}</p>
          <p>{t("finish")}</p>
        </details>
      </div>
      <div className="card exports">
        <div>
          <label>
            {t("paper")}
            <select
              value={paper}
              onChange={(e) => setPaper(e.target.value as typeof paper)}
            >
              <option>A4</option>
              <option>Letter</option>
            </select>
          </label>
          <label>
            {t("textSize")}
            <input
              type="number"
              min="9"
              max="14"
              value={textSize}
              onChange={(e) => setTextSize(+e.target.value)}
            />
          </label>
        </div>
        <button
          className="outline"
          disabled={pdfBusy}
          onClick={() => void pdf()}
        >
          {t("exportPdf")}
        </button>
        <button
          className="outline"
          onClick={() =>
            void download(
              "ip-rasm.json",
              JSON.stringify(projectFile(project), null, 2),
            ).catch((e) => setError(String(e)))
          }
        >
          {t("exportJson")}
        </button>
        <button
          className="outline"
          onClick={() =>
            void download(
              "ip-rasm.txt",
              toTxt(instruction),
              "text/plain",
            ).catch((e) => setError(String(e)))
          }
        >
          {t("exportTxt")}
        </button>
        <button
          className="outline"
          onClick={() => {
            const c = document.createElement("canvas");
            c.width = 1024;
            c.height = Math.round(
              (1024 * instruction.profile.heightMm) /
                instruction.profile.widthMm,
            );
            renderInstruction(c.getContext("2d")!, instruction);
            c.toBlob((b) => {
              if (b)
                void download("ip-rasm.png", b).catch((e) =>
                  setError(String(e)),
                );
            });
          }}
        >
          {t("exportPreview")}
        </button>
      </div>
      <details className="card">
        <summary>
          {locale === "en"
            ? "Animation"
            : locale === "ru"
              ? "Анимация"
              : locale === "uz-Cyrl"
                ? "Анимация"
                : "Animatsiya"}
        </summary>
        <Suspense fallback={<span>…</span>}>
          <SequenceAnimation instruction={instruction} locale={locale} />
        </Suspense>
      </details>
      {project.progress.confirmed === steps.length && (
        <div className="alert success">{t("finish")}</div>
      )}
    </>
  );
}
