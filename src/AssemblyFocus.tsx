import { guideText } from "./guide-i18n";
import { useEffect, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { ScreenAwakeLease } from "./screen-awake";
import type { Instruction, Locale } from "./core/types";
import { flatten } from "./core/engine";
import { pinLabel } from "./core/standard-kit";
import { baseLocale, scriptText } from "./uzbek-script";
const native = registerPlugin<{
  set(options: { enabled: boolean }): Promise<void>;
}>("IpRasmAwake");
const words = {
  uz: {
    previous: "Oldingi qadam",
    next: "Keyingi qadam",
    confirm: "Qadamni tasdiqlash",
    remaining: "qoldi",
    saved: "Avtomatik saqlanadi",
    awake: "Ekran yoqib turiladi",
    unavailable: "Ekran o‘chsa, qurilma sozlamasidan vaqtini uzaytiring",
    hours: "soat",
  },
  ru: {
    previous: "Предыдущий шаг",
    next: "Следующий шаг",
    confirm: "Подтвердить шаг",
    remaining: "осталось",
    saved: "Сохраняется автоматически",
    awake: "Экран остаётся включённым",
    unavailable: "Если экран гаснет, увеличьте время в настройках устройства",
    hours: "ч",
  },
  en: {
    previous: "Previous step",
    next: "Next step",
    confirm: "Confirm step",
    remaining: "left",
    saved: "Saved automatically",
    awake: "Screen stays on",
    unavailable: "If the screen sleeps, increase the device screen timeout",
    hours: "h",
  },
};
export function AssemblyFocus({
  instruction,
  current,
  confirmed,
  pace,
  locale,
  disabled,
  saveState,
  onJump,
  onConfirm,
}: {
  instruction: Instruction;
  current: number;
  confirmed: number;
  pace: number;
  locale: Locale;
  disabled: boolean;
  saveState: "saved" | "saving" | "failed";
  onJump: (n: number) => void;
  onConfirm: () => void;
}) {
  const [awake, setAwake] = useState<"on" | "off" | "unavailable">("off");
  const t = (k: keyof typeof words.en) =>
    scriptText(words[baseLocale(locale)][k], locale);
  useEffect(() => {
    let live = true;
    const lease = new ScreenAwakeLease(
      async () => {
        if (Capacitor.isNativePlatform()) {
          await native.set({ enabled: true });
          return { release: () => native.set({ enabled: false }) };
        }
        if (!navigator.wakeLock) throw Error("unavailable");
        return navigator.wakeLock.request("screen");
      },
      (s) => {
        if (live) setAwake(s);
      },
    );
    const update = () => void lease.set(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", update);
      void lease.set(false);
    };
  }, []);
  const steps = flatten(instruction),
    step = steps[current - 1],
    hours = Math.max(0, ((steps.length - confirmed) * pace) / 3600),
    percent = steps.length ? Math.floor((confirmed * 100) / steps.length) : 100;
  return (
    <section className="assembly-focus" data-testid="assembly-focus">
      <strong
        className="assembly-focus-route"
        data-testid="assembly-current-route"
        aria-live="polite"
      >
        {step
          ? pinLabel(instruction.profile, step.from) +
            " → " +
            pinLabel(instruction.profile, step.to)
          : ""}
      </strong>
      <div className="assembly-focus-status">
        <span data-testid="assembly-percent">
          {percent}% · ~{hours.toFixed(1)} {t("hours")} {t("remaining")}
        </span>
        <small data-testid="assembly-awake">
          {awake === "on"
            ? t("awake")
            : awake === "unavailable"
              ? t("unavailable")
              : ""}
        </small>
      </div>
      <progress
        value={confirmed}
        max={steps.length}
        aria-label={percent + "%"}
      />
      <div className="assembly-focus-actions">
        <button
          data-testid="assembly-previous"
          className="outline"
          aria-label={t("previous")}
          disabled={current <= 1}
          onClick={() => onJump(current - 1)}
        >
          ‹
        </button>
        <button
          data-testid="assembly-confirm"
          className="primary"
          disabled={disabled}
          onClick={onConfirm}
        >
          {t("confirm")}
        </button>
        <button
          data-testid="assembly-next"
          className="outline"
          aria-label={t("next")}
          disabled={current >= steps.length}
          onClick={() => onJump(current + 1)}
        >
          ›
        </button>
      </div>
      <small data-testid="assembly-save-state" data-state={saveState}>
        {guideText(locale, saveState === "failed" ? "saveFailed" : saveState)}
      </small>
    </section>
  );
}
