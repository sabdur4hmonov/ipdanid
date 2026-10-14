import { Capacitor, registerPlugin } from "@capacitor/core";
import { recordedVoices, type RecordedVoice } from "./core/recorded-voices";
import { recordedClipPlayer } from "./recorded-player";
export type GuideVoice = {
  id: string;
  name: string;
  lang: string;
  native: boolean;
  browser?: SpeechSynthesisVoice;
  recorded?: RecordedVoice;
};
type NativeVoice = { id: string; name: string; lang: string };
const native = registerPlugin<{
  voices(): Promise<{ voices: NativeVoice[] }>;
  speak(options: {
    text: string;
    voiceId: string;
    language: string;
    rate: number;
    requestId: number;
    session: string;
  }): Promise<{ queued: boolean }>;
  stop(options: { requestId: number; session: string }): Promise<void>;
}>("IpRasmSpeech");
let requestId = 0;
const session = crypto.randomUUID();
export const androidSpeech = () => Capacitor.getPlatform() === "android";
export async function guideVoices(): Promise<GuideVoice[]> {
  const recorded = (await recordedVoices()).map((v) => ({
    id: v.id,
    name: v.name,
    lang: v.lang,
    native: false,
    recorded: v,
  }));
  if (androidSpeech())
    return [
      ...recorded,
      ...(await native.voices()).voices.map((v) => ({ ...v, native: true })),
    ];
  return [
    ...recorded,
    ...(window.speechSynthesis?.getVoices() ?? []).map((v) => ({
      id: v.voiceURI,
      name: v.name,
      lang: v.lang,
      native: false,
      browser: v,
    })),
  ];
}
export function cancelGuideSpeech() {
  recordedClipPlayer.stop();
  if (androidSpeech())
    void native.stop({ requestId: ++requestId, session }).catch(() => {});
  else window.speechSynthesis?.cancel();
}
export async function nativeGuideSpeech(
  text: string,
  voice: GuideVoice,
  language: string,
  rate: number,
) {
  return native.speak({
    text,
    voiceId: voice.id,
    language,
    rate,
    requestId: ++requestId,
    session,
  });
}
