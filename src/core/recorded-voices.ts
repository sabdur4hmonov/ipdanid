import {
  VOICE_LANGUAGES,
  INSTRUCTOR_IDS,
  requiredVoiceClips,
  stepVoiceClips,
  type VoiceLanguage,
  type InstructorId,
} from "./voice-catalog";
export interface VoiceClip {
  path: string;
  sha256: string;
  bytes: number;
  durationMs: number;
}
export interface VoiceManifest {
  version: "recorded-instructors/1";
  profiles: {
    id: InstructorId;
    name: string;
    clips: Partial<Record<VoiceLanguage, Record<string, VoiceClip>>>;
  }[];
}
export interface RecordedVoice {
  id: string;
  name: string;
  lang: VoiceLanguage;
  instructor: InstructorId;
  clips: Record<string, VoiceClip>;
}
export function availableRecordedVoices(value: unknown): RecordedVoice[] {
  const m = value as VoiceManifest;
  if (
    !m ||
    m.version !== "recorded-instructors/1" ||
    !Array.isArray(m.profiles) ||
    m.profiles.length !== 2 ||
    new Set(m.profiles.map((p) => p.id)).size !== 2 ||
    m.profiles.some(
      (p) =>
        !INSTRUCTOR_IDS.includes(p.id) ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 80 ||
        !p.clips,
    )
  )
    throw Error("Invalid recorded voice manifest");
  const available: RecordedVoice[] = [];
  for (const p of m.profiles)
    for (const lang of VOICE_LANGUAGES) {
      const required = Object.keys(requiredVoiceClips(lang)),
        clips = p.clips[lang];
      if (!clips) continue;
      const complete = required.every((id) => {
        const c = clips[id];
        return (
          c &&
          c.path === `/voices/${lang}/${p.id}/${id}.wav` &&
          /^[a-f0-9]{64}$/.test(c.sha256) &&
          Number.isSafeInteger(c.bytes) &&
          c.bytes >= 44 &&
          c.bytes <= 1_500_000 &&
          Number.isFinite(c.durationMs) &&
          c.durationMs >= 20 &&
          c.durationMs <= 30000
        );
      });
      if (complete)
        available.push({
          id: `recorded:${lang}:${p.id}`,
          name: p.name,
          lang,
          instructor: p.id,
          clips,
        });
    }
  return available;
}
let manifest: Promise<RecordedVoice[]> | undefined;
export function recordedVoices() {
  return (manifest ??= (async () => {
    try {
      const r = await fetch("/voices/manifest.json");
      if (!r.ok) return [];
      return availableRecordedVoices(await r.json());
    } catch {
      return [];
    }
  })());
}
export function recordedStepEntries(
  voice: RecordedVoice,
  step: number,
  from: number,
  to: number,
  start: "first" | "color" | undefined,
  profile?: import("./types").MaterialProfile,
) {
  return stepVoiceClips(
    voice.lang,
    step,
    from,
    to,
    start,
    profile?.standardKit
      ? { pins: profile.pins.length, count: profile.standardKit.config.sectors }
      : undefined,
  ).map((id) => {
    const c = voice.clips[id];
    if (!c) throw Error("Recorded phrase unavailable");
    return c;
  });
}
