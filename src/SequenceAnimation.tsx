import { useEffect, useRef, useState } from "react";
import type { Instruction, Locale } from "./core/types";
import {
  exportSequenceAnimation,
  videoMime,
} from "./sequence-animation-export";
import { animationText } from "./animation-i18n";
import { download } from "./download";
import { useBuildAccess } from "./useBuildAccess";
import { kitText } from "./kit-i18n";
export default function SequenceAnimation({
  instruction,
  locale,
  active = true,
}: {
  instruction: Instruction;
  locale: Locale;
  active?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    controller = useRef<AbortController>(undefined),
    [busy, setBusy] = useState(false),
    [fraction, setFraction] = useState(0),
    [error, setError] = useState(false),
    [done, setDone] = useState(false),
    [shown, setShown] = useState(false);
  const allowed = useBuildAccess([instruction]);
  const permitted = allowed(instruction);
  const t = (key: Parameters<typeof animationText>[1]) =>
      animationText(locale, key),
    supported = !!videoMime();
  useEffect(() => {
    setShown(false);
    setDone(false);
    setError(false);
    return () => controller.current?.abort();
  }, [instruction.sequenceHash, active, permitted]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) controller.current?.abort();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  async function start(mode: "video" | "gif") {
    if (busy || !active || !permitted) return;
    const job = new AbortController();
    controller.current = job;
    setBusy(true);
    setFraction(0);
    setError(false);
    setDone(false);
    setShown(true);
    try {
      const result = await exportSequenceAnimation(
        instruction,
        canvas.current!,
        mode,
        job.signal,
        setFraction,
      );
      if (!job.signal.aborted) {
        await download(
          `ip-rasm-${instruction.sequenceHash.slice(0, 12)}.${result.extension}`,
          result.blob,
        );
        setDone(true);
      }
    } catch (e) {
      if (!job.signal.aborted) setError(true);
    } finally {
      if (controller.current === job) {
        controller.current = undefined;
        setBusy(false);
      }
    }
  }
  return (
    <section data-testid="sequence-animation">
      <h3>{t("title")}</h3>
      <p>{t("hint")}</p>
      {!supported && <p>{t("unsupported")}</p>}
      {!permitted && <p data-testid="animation-locked">{kitText(locale, "hint")}</p>}
      <canvas
        ref={canvas}
        width={1000}
        height={1000}
        hidden={!shown}
        style={{ width: 320, maxWidth: "100%", height: "auto" }}
        aria-label={t("title")}
        data-testid="animation-canvas"
        data-sequence-hash={instruction.sequenceHash}
      />
      <div className="grid-actions">
        <button
          disabled={busy || !active || !permitted || !supported}
          onClick={() => void start("video")}
        >
          {t("video")}
        </button>
        <button disabled={busy || !active || !permitted} onClick={() => void start("gif")}>
          {t("gif")}
        </button>
        {busy && (
          <button onClick={() => controller.current?.abort()}>
            {t("cancel")}
          </button>
        )}
      </div>
      {busy && (
        <p role="status">
          {t("busy")} {Math.round(fraction * 100)}%
          <progress max={1} value={fraction} />
        </p>
      )}
      {error && <p role="alert">{t("error")}</p>}
      {done && <p role="status">{t("done")}</p>}
    </section>
  );
}
