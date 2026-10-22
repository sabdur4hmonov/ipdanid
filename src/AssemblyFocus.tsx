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
    rest: "Dam olish",
    resume: "Davom etish",
    restSaved: "Dam olish uchun qadam saqlandi",
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
    rest: "Отдохнуть",
    resume: "Продолжить",
    restSaved: "Шаг сохранён для перерыва",
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
    rest: "Take a break",
    resume: "Resume",
    restSaved: "Step saved for your break",
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
  resting,
  restSaveState,
  onRest,
  onResume,
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
  resting: boolean;
  restSaveState: "saving" | "saved" | "failed";
  onRest: () => Promise<void>;
  onResume: () => void;
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
    const update = () =>
      void lease.set(!resting && document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", update);
      void lease.set(false);
    };
  }, [resting]);
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
      <button
        data-testid="assembly-rest"
        className="outline"
        disabled={disabled || (resting && restSaveState === "saving")}
        onClick={() =>
          resting && restSaveState === "saved" ? onResume() : void onRest()
        }
      >
        {t(resting && restSaveState === "saved" ? "resume" : "rest")}
      </button>
      {resting && (
        <p
          role="status"
          data-testid="assembly-rest-status"
          data-state={restSaveState}
        >
          {restSaveState === "saved"
            ? `${t("restSaved")}: ${current} · ${pinLabel(instruction.profile, step.from)} → ${pinLabel(instruction.profile, step.to)}`
            : guideText(
                locale,
                restSaveState === "failed" ? "saveFailed" : "saving",
              )}
        </p>
      )}
      <small data-testid="assembly-save-state" data-state={saveState}>
        {guideText(locale, saveState === "failed" ? "saveFailed" : saveState)}
      </small>
    </section>
  );
}
