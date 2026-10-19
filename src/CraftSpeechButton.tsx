import { useEffect, useRef, useState } from "react";
import { createCraftNarrator } from "./craft-voice";
import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
export function CraftSpeechButton({
  identity,
  text,
  locale,
}: {
  identity: string;
  text: string;
  locale: Locale;
}) {
  const narrator = useRef<ReturnType<typeof createCraftNarrator>>(undefined),
    epoch = useRef(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  if (!narrator.current) narrator.current = createCraftNarrator();
  const words = {
      play: ["Qadamni aytish", "Прочитать шаг", "Read this step"],
      stop: ["Ovozni to‘xtatish", "Остановить голос", "Stop step voice"],
      missing: [
        "Shu tilda mahalliy ovoz topilmadi. Qadam matni doim ekranda bor.",
        "Локальный голос для этого языка недоступен. Текст шага остаётся на экране.",
        "A local voice for this language is unavailable. The step text remains on screen.",
      ],
    } as const,
    t = (key: keyof typeof words) =>
      scriptText(
        words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
        locale,
      );
  const stop = () => {
    epoch.current++;
    narrator.current!.stop();
    setBusy(false);
  };
  useEffect(() => {
    stop();
    setError(false);
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      epoch.current++;
      narrator.current!.stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [identity, text, locale]);
  return (
    <div className="grid-actions" data-testid="craft-step-voice">
      <button
        disabled={busy || !text}
        onClick={() => {
          const request = ++epoch.current;
          setBusy(true);
          setError(false);
          void narrator
            .current!.speak(text, locale)
            .then((queued) => {
              if (epoch.current === request) setError(!queued);
            })
            .catch(() => {
              if (epoch.current === request) setError(true);
            })
            .finally(() => {
              if (epoch.current === request) setBusy(false);
            });
        }}
      >
        {t("play")}
      </button>
      <button onClick={stop}>{t("stop")}</button>
      {error && <p role="status">{t("missing")}</p>}
    </div>
  );
}
