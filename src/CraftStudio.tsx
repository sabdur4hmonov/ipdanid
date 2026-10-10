import { useState } from "react";
import { GridStudio } from "./GridStudio";
import { PaintStudio } from "./PaintStudio";
import { paintText } from "./paint-i18n";
import type { Locale } from "./core/types";
export function CraftStudio({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<"grid" | "paint">("grid");
  return (
    <>
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
      </div>
      {mode === "grid" ? (
        <GridStudio locale={locale} />
      ) : (
        <PaintStudio locale={locale} />
      )}
    </>
  );
}
