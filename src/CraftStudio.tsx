import { useFeatures } from "./FeatureContext";
import { lazy, Suspense, useState } from "react";
const GridStudio = lazy(() => import("./GridStudio").then(m => ({ default: m.GridStudio })));
const PaintStudio = lazy(() => import("./PaintStudio").then(m => ({ default: m.PaintStudio })));
import { paintText } from "./paint-i18n";
import type { Instruction, Locale } from "./core/types";
import { letteringText } from "./lettering-i18n";
import { qrCraftText } from "./qr-craft-i18n";
import { bookText } from "./book-i18n";
import { solidText } from "./solid-i18n";
import { tutorialText } from "./tutorial-i18n";
const TextStudio = lazy(() => import("./TextStudio"));
const QrCraftStudio = lazy(() => import("./QrCraftStudio"));
const BookStudio = lazy(() => import("./BookStudio"));
const SolidStudio = lazy(() => import("./SolidStudio"));
const TutorialStudio = lazy(() => import("./TutorialStudio"));
export function CraftStudio({
  locale,
  onGuide,
  onPreset,
}: {
  locale: Locale;
  onGuide: (i: Instruction) => void;
  onPreset: (kind: "animal" | "object") => void;
}) {
  const features = useFeatures();
  const [mode, setMode] = useState<
    "grid" | "paint" | "text" | "qr" | "book" | "solid" | "tutorial"
  >("grid");
  const allowed = {grid: features.mosaic || features.diamond, paint: features.paint, text: features.lettering, qr: features.qr, book: features.book, solid: features.models, tutorial: features.workshops};
  const activeMode = allowed[mode] ? mode : (Object.keys(allowed) as (keyof typeof allowed)[]).find(k => allowed[k]);
  if (!activeMode) return null;
  return (
    <>
      <div className="card">
        <p>{letteringText(locale, "presetHint")}</p>
        <div className="grid-actions">
          <button onClick={() => onPreset("animal")}>
            {letteringText(locale, "animal")}
          </button>
          <button onClick={() => onPreset("object")}>
            {letteringText(locale, "object")}
          </button>
        </div>
      </div>
      <div
        className="grid-actions"
        role="group"
        aria-label={paintText(locale, "title")}
      >
        {allowed.grid && <>        <button aria-pressed={activeMode === "grid"} onClick={() => setMode("grid")}>
          {paintText(locale, "crafts")}
        </button></>}
        {allowed.paint && <>        <button
          aria-pressed={activeMode === "paint"}
          onClick={() => setMode("paint")}
        >
          {paintText(locale, "paint")}
        </button></>}
        {allowed.text && <>        <button aria-pressed={activeMode === "text"} onClick={() => setMode("text")}>
          {letteringText(locale, "title")}
        </button></>}
        {allowed.qr && <>        <button aria-pressed={activeMode === "qr"} onClick={() => setMode("qr")}>
          {qrCraftText(locale, "title")}
        </button></>}
        {allowed.book && <>        <button aria-pressed={activeMode === "book"} onClick={() => setMode("book")}>
          {bookText(locale, "title")}
        </button></>}
        {allowed.solid && <>        <button
          aria-pressed={activeMode === "solid"}
          onClick={() => setMode("solid")}
        >
          {solidText(locale, "title")}
        </button></>}
        {allowed.tutorial && <>        <button
          aria-pressed={activeMode === "tutorial"}
          onClick={() => setMode("tutorial")}
        >
          {tutorialText(locale, "title")}
        </button></>}
      </div>
      {activeMode === "tutorial" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <TutorialStudio locale={locale} />
        </Suspense>
      ) : activeMode === "solid" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <SolidStudio locale={locale} />
        </Suspense>
      ) : activeMode === "book" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <BookStudio locale={locale} />
        </Suspense>
      ) : activeMode === "qr" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <QrCraftStudio locale={locale} />
        </Suspense>
      ) : activeMode === "text" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <TextStudio locale={locale} onGuide={onGuide} />
        </Suspense>
      ) : activeMode === "grid" ? (
        <GridStudio locale={locale} />
      ) : (
        <PaintStudio locale={locale} />
      )}
    </>
  );
}
