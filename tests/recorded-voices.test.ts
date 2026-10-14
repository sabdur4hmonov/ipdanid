import { it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  requiredVoiceClips,
  numberVoiceClips,
  stepVoiceClips,
  VOICE_LANGUAGES,
  VOICE_PHRASES,
  INSTRUCTOR_IDS,
} from "../src/core/voice-catalog";
import {
  availableRecordedVoices,
  type VoiceManifest,
  type VoiceClip,
} from "../src/core/recorded-voices";
import { voiceWavDuration } from "../src/core/voice-wav";
import { RecordedClipPlayer } from "../src/recorded-player";
import { hash } from "../src/core/engine";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function wav() {
  const b = new Uint8Array(4844),
    v = new DataView(b.buffer),
    text = (at: number, s: string) => b.set(new TextEncoder().encode(s), at);
  text(0, "RIFF");
  v.setUint32(4, b.length - 8, true);
  text(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 24000, true);
  v.setUint32(28, 48000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, 4800, true);
  return b;
}
it("exact UZ/RU/EN recordings cover every guide step0–20000 and Russian thousand agreement", () => {
  expect(Object.keys(VOICE_PHRASES)).toHaveLength(60);
  const spoken = (lang: (typeof VOICE_LANGUAGES)[number], n: number) =>
    numberVoiceClips(lang, n)
      .map((id) => requiredVoiceClips(lang)[id])
      .join(" ");
  expect(spoken("uz", 235)).toBe("ikki yuz o‘ttiz besh");
  expect(spoken("uz", 1001)).toBe("ming bir");
  expect(spoken("ru", 21021)).toBe("двадцать одна тысяча двадцать один");
  expect(spoken("ru", 12000)).toBe("двенадцать тысяч");
  expect(spoken("ru", 2000)).toBe("две тысячи");
  expect(spoken("en", 20000)).toBe("twenty thousand");
  for (const lang of VOICE_LANGUAGES) {
    const clips = requiredVoiceClips(lang);
    expect(Object.keys(clips)).toHaveLength(lang === "ru" ? 101 : 97);
    for (let n = 0; n <= 20000; n++)
      expect(
        numberVoiceClips(lang, n).every((id) => typeof clips[id] === "string"),
      ).toBe(true);
    expect(stepVoiceClips(lang, 235, 0, 240, "first").at(-1)).toBe(
      "start-knot",
    );
  }
  expect(() => numberVoiceClips("uz", -1)).toThrow();
  expect(() => numberVoiceClips("en", 1_000_000)).toThrow();
});
it("empty installed manifest never advertises fictional instructors; only complete local hashed sets become selectable", () => {
  expect(
    availableRecordedVoices(
      JSON.parse(readFileSync("public/voices/manifest.json", "utf8")),
    ),
  ).toEqual([]);
  const m: VoiceManifest = {
    version: "recorded-instructors/1",
    profiles: INSTRUCTOR_IDS.map((id, k) => ({
      id,
      name: id,
      clips: {
        en: Object.fromEntries(
          Object.keys(requiredVoiceClips("en")).map((clip) => [
            clip,
            {
              path: `/voices/en/${id}/${clip}.wav`,
              sha256: String(k + 1).repeat(64),
              bytes: 4844,
              durationMs: 100,
            },
          ]),
        ),
      },
    })),
  };
  expect(availableRecordedVoices(m)).toHaveLength(2);
  delete m.profiles[0].clips.en!.step;
  expect(availableRecordedVoices(m)).toHaveLength(1);
  m.profiles[1].clips.en!.step.path = "https://example.com/voice.wav";
  expect(availableRecordedVoices(m)).toEqual([]);
  m.profiles[1].id = m.profiles[0].id;
  expect(() => availableRecordedVoices(m)).toThrow();
});
it("recording index accepts exact PCM16 mono24kHz WAV and refuses truncated/wrong-format audio", () => {
  const b = wav();
  expect(voiceWavDuration(b)).toBe(100);
  expect(() => voiceWavDuration(b.slice(0, -1))).toThrow();
  const stereo = b.slice();
  new DataView(stereo.buffer).setUint16(22, 2, true);
  expect(() => voiceWavDuration(stereo)).toThrow();
  const wrongRate = b.slice();
  new DataView(wrongRate.buffer).setUint32(24, 44100, true);
  expect(() => voiceWavDuration(wrongRate)).toThrow();
});
function audio() {
  const sources: any[] = [];
  class FakeContext {
    currentTime = 4;
    destination = {};
    async resume() {}
    async decodeAudioData() {
      return { duration: 0.1, numberOfChannels: 1, length: 2400 };
    }
    createBufferSource() {
      const s: any = {
        playbackRate: { value: 1 },
        connect: vi.fn(),
        start: vi.fn((at: number) => (s.at = at)),
        stop: vi.fn(() => s.onended?.()),
        onended: null,
      };
      sources.push(s);
      return s;
    }
  }
  vi.stubGlobal("AudioContext", FakeContext);
  return sources;
}
async function clip(): Promise<VoiceClip> {
  const b = wav();
  return {
    path: "/voices/en/instructor-a/step.wav",
    sha256: await hash(b),
    bytes: b.length,
    durationMs: 100,
  };
}
it("scheduled recorded playback is ordered, bounded and cancelled immediately across pause/step changes", async () => {
  const sources = audio(),
    b = wav(),
    c = await clip();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => b.buffer })),
  );
  const player = new RecordedClipPlayer(),
    playing = player.play([c, c], 1);
  await vi.waitFor(() => expect(sources).toHaveLength(2));
  expect(sources[1].at - sources[0].at).toBeCloseTo(0.135, 6);
  player.stop();
  expect(await playing).toBe(false);
  expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
  const next = player.play([c], 0.5);
  await vi.waitFor(() => expect(sources).toHaveLength(3));
  expect(sources[2].playbackRate.value).toBe(0.5);
  sources[2].onended();
  expect(await next).toBe(true);
});
it("corrupt/missing audio never plays or silently fetches an external voice", async () => {
  const sources = audio(),
    c = await clip(),
    bad = wav();
  bad[100] = 1;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => bad.buffer })),
  );
  await expect(new RecordedClipPlayer().play([c], 1)).rejects.toThrow(
    "integrity",
  );
  expect(sources).toHaveLength(0);
  await expect(
    new RecordedClipPlayer().play(
      [{ ...c, path: "https://example.com/step.wav" }],
      1,
    ),
  ).rejects.toThrow("path");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false })),
  );
  await expect(new RecordedClipPlayer().play([c], 1)).rejects.toThrow(
    "unavailable",
  );
});
it("cancel during preload cannot later start stale audio", async () => {
  const sources = audio(),
    c = await clip(),
    b = wav();
  let release: ((v: any) => void) | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((r) => {
          release = r;
        }),
    ),
  );
  const player = new RecordedClipPlayer(),
    pending = player.play([c], 1);
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  player.stop();
  release!({ ok: true, arrayBuffer: async () => b.buffer });
  expect(await pending).toBe(false);
  expect(sources).toHaveLength(0);
});
