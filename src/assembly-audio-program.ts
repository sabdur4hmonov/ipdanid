import { flatten } from "./core/engine";
import { pinLabel } from "./core/standard-kit";
import { recordedStepEntries, type VoiceClip } from "./core/recorded-voices";
import type { Instruction, Locale } from "./core/types";
import type { GuideVoice } from "./guide-speech";
import { spokenPin, translate } from "./i18n";
import { spokenKitPin } from "./sector-speech";

export type AudioLanguage = "uz" | "ru" | "en";
export type AssemblyAudioProgram = {
  version: "assembly-audio/1";
  session: string;
  sequenceHash: string;
  projectId: string;
  language: AudioLanguage;
  uiLocale: Locale;
  voiceId: string;
  rate: number;
  pace: number;
  current: number;
  advance: boolean;
  clips: VoiceClip[];
  steps: { text: string; route: string; clips: number[] }[];
};
export function assemblyStepText(
  instruction: Instruction,
  current: number,
  language: AudioLanguage,
  step = flatten(instruction)[current - 1],
) {
  if (!step) throw Error("Invalid announced step");
  const t = translate(language);
  return `${t("pdfStep")} ${spokenPin(language, current)}. ${spokenKitPin(language, instruction.profile, step.from)} ${t("from")}, ${spokenKitPin(language, instruction.profile, step.to)} ${t("to")}.${step.segmentStart ? " " + t(step.segment === 0 ? "startKnot" : "colorChange") : ""}`;
}
export function assemblyAudioProgram(options: {
  instruction: Instruction;
  projectId: string;
  voice: GuideVoice;
  language: AudioLanguage;
  locale?: Locale;
  current: number;
  rate: number;
  pace: number;
  advance?: boolean;
}): AssemblyAudioProgram {
  const { instruction, voice, language, current, rate, pace } = options,
    flat = flatten(instruction);
  if (
    !/^[a-f0-9]{64}$/.test(instruction.sequenceHash) ||
    typeof options.projectId !== "string" ||
    !options.projectId.trim() ||
    options.projectId.length > 200 ||
    /[\x00-\x1f\x7f]/.test(options.projectId) ||
    !["uz", "ru", "en"].includes(language) ||
    !["uz", "uz-Cyrl", "ru", "en"].includes(options.locale ?? language) ||
    !voice.lang.toLowerCase().startsWith(language) ||
    (!voice.native && !voice.recorded) ||
    (!voice.recorded && (!voice.id || voice.id.length > 200)) ||
    !flat.length ||
    flat.length !== instruction.metrics.lines ||
    flat.length > 20000 ||
    !Number.isInteger(current) ||
    current < 1 ||
    current > flat.length ||
    !Number.isFinite(rate) ||
    rate < 0.5 ||
    rate > 1.5 ||
    !Number.isFinite(pace) ||
    pace < 2 ||
    pace > 120
  )
    throw Error("Invalid native audio program");
  const clips: VoiceClip[] = [],
    lookup = new Map<string, number>();
  const steps = flat.map((step, k) => {
    const recorded = voice.recorded
      ? recordedStepEntries(
          voice.recorded,
          k + 1,
          step.from,
          step.to,
          step.segmentStart
            ? step.segment === 0
              ? "first"
              : "color"
            : undefined,
          instruction.profile,
        )
      : [];
    const indices = recorded.map((c) => {
      if (
        !/^\/voices\/(uz|ru|en)\/instructor-[ab]\/[a-z0-9-]+\.wav$/.test(
          c.path,
        ) ||
        !c.path.startsWith(`/voices/${language}/`) ||
        !/^[a-f0-9]{64}$/.test(c.sha256) ||
        !Number.isSafeInteger(c.bytes) ||
        c.bytes < 44 ||
        c.bytes > 1500000 ||
        !Number.isSafeInteger(c.durationMs) ||
        c.durationMs < 20 ||
        c.durationMs > 30000
      )
        throw Error("Invalid native recorded clip");
      let index = lookup.get(c.path);
      if (
        index !== undefined &&
        JSON.stringify(clips[index]) !== JSON.stringify(c)
      )
        throw Error("Conflicting native recorded clip");
      if (index === undefined) {
        index = clips.length;
        clips.push({ ...c });
        lookup.set(c.path, index);
      }
      return index;
    });
    const text = assemblyStepText(instruction, k + 1, language, step),
      route = `${pinLabel(instruction.profile, step.from)} → ${pinLabel(instruction.profile, step.to)}`;
    if (
      text.length > 600 ||
      indices.length > 32 ||
      recorded.reduce((n, c) => n + c.durationMs / rate + 35, 0) > 120000
    )
      throw Error("Native spoken step exceeds playback limits");
    return { text, route, clips: indices };
  });
  const program: AssemblyAudioProgram = {
    version: "assembly-audio/1",
    session: crypto.randomUUID(),
    sequenceHash: instruction.sequenceHash,
    projectId: options.projectId,
    language,
    uiLocale: options.locale ?? language,
    voiceId: voice.recorded ? "" : voice.id,
    rate,
    pace,
    current,
    advance: options.advance !== false,
    clips,
    steps,
  };
  if (
    clips.length > 512 ||
    clips.reduce((n, c) => n + c.bytes, 0) > 32 * 1024 * 1024 ||
    JSON.stringify(program).length > 12000000
  )
    throw Error("Native audio program exceeds memory limits");
  return program;
}
