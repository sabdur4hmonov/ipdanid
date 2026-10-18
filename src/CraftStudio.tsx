import { lazy, Suspense, useState } from "react";
import { GridStudio } from "./GridStudio";
import { PaintStudio } from "./PaintStudio";
import { paintText } from "./paint-i18n";
import type { Instruction, Locale } from "./core/types";
import { letteringText } from "./lettering-i18n";
import { qrCraftText } from "./qr-craft-i18n";
import { bookText } from "./book-i18n";
const TextStudio = lazy(() => import("./TextStudio"));
const QrCraftStudio = lazy(() => import("./QrCraftStudio"));
const BookStudio = lazy(() => import("./BookStudio"));
export function CraftStudio({
  locale,
  onGuide,
  onPreset,
}: {
  locale: Locale;
  onGuide: (i: Instruction) => void;
  onPreset: (kind: "animal" | "object") => void;
}) {
  const [mode, setMode] = useState<"grid" | "paint" | "text" | "qr" | "book">(
    "grid",
  );
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
        <button aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>
          {paintText(locale, "crafts")}
        </button>
        <button
          aria-pressed={mode === "paint"}
          onClick={() => setMode("paint")}
        >
          {paintText(locale, "paint")}
        </button>
        <button aria-pressed={mode === "text"} onClick={() => setMode("text")}>
          {letteringText(locale, "title")}
        </button>
        <button aria-pressed={mode === "qr"} onClick={() => setMode("qr")}>
          {qrCraftText(locale, "title")}
        </button>
        <button aria-pressed={mode === "book"} onClick={() => setMode("book")}>
          {bookText(locale, "title")}
        </button>
      </div>
      {mode === "book" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <BookStudio locale={locale} />
        </Suspense>
      ) : mode === "qr" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <QrCraftStudio locale={locale} />
        </Suspense>
      ) : mode === "text" ? (
        <Suspense fallback={<p role="status">…</p>}>
          <TextStudio locale={locale} onGuide={onGuide} />
        </Suspense>
      ) : mode === "grid" ? (
        <GridStudio locale={locale} />
      ) : (
        <PaintStudio locale={locale} />
      )}
    </>
  );
}
