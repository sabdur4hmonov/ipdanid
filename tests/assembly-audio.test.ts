import { beforeAll, describe, expect, test, vi } from "vitest";
import {
  assemblyAudioProgram,
  assemblyStepText,
  type AssemblyAudioProgram,
} from "../src/assembly-audio-program";
import {
  AssemblyAudioDriver,
  type AssemblyAudioAdapter,
  type AssemblyAudioSnapshot,
} from "../src/assembly-audio-driver";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
  pinLabel,
} from "../src/core/standard-kit";
import { flatten } from "../src/core/engine";
import type { Instruction } from "../src/core/types";
import { requiredVoiceClips } from "../src/core/voice-catalog";
import type { GuideVoice } from "../src/guide-speech";
let instruction: Instruction;
const voice: GuideVoice = {
  id: "offline-en",
  name: "English",
  lang: "en-US",
  native: true,
};
beforeAll(async () => {
  instruction = await generateClassicLeastSquares({
    pixels: new Uint8Array(64 * 64 * 3).fill(130),
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
      true,
    ),
    resolution: 64,
    lines: 40,
    mode: "dark",
    accessPolicy: "kit-build/1",
  });
});
const make = (
  extra: Partial<Parameters<typeof assemblyAudioProgram>[0]> = {},
) =>
  assemblyAudioProgram({
    instruction,
    projectId: "audio-project",
    voice,
    language: "en",
    current: 17,
    pace: 8,
    rate: 0.9,
    ...extra,
  });
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const state = (
  p: AssemblyAudioProgram,
  extra: Partial<AssemblyAudioSnapshot> = {},
): AssemblyAudioSnapshot => ({
  version: "assembly-audio-state/1",
  session: p.session,
  sequenceHash: p.sequenceHash,
  current: p.current,
  total: p.steps.length,
  revision: 1,
  active: true,
  playing: true,
  error: "",
  ...extra,
});
function adapter() {
  return {
    capabilities: vi.fn(async () => ({ supported: true })),
    start: vi.fn(async (o) => state(o.program)),
    command: vi.fn(),
    status: vi.fn(),
    stop: vi.fn(
      async (_options: Parameters<AssemblyAudioAdapter["stop"]>[0]) => {},
    ),
  } satisfies AssemblyAudioAdapter;
}
describe("native assembly program", () => {
  test("one immutable sequence supplies exact sector routes and current-step speech without photos or confirmation data", () => {
    const p = make(),
      flat = flatten(instruction);
    expect(p.steps).toHaveLength(40);
    expect(p.current).toBe(17);
    expect(p.sequenceHash).toBe(instruction.sequenceHash);
    expect(p.advance).toBe(true);
    for (const [k, s] of p.steps.entries()) {
      expect(s.route).toBe(
        `${pinLabel(instruction.profile, flat[k].from)} → ${pinLabel(instruction.profile, flat[k].to)}`,
      );
      expect(s.text).toBe(assemblyStepText(instruction, k + 1, "en"));
    }
    expect(Object.keys(p).sort()).toEqual(
      [
        "version",
        "session",
        "sequenceHash",
        "projectId",
        "language",
        "uiLocale",
        "voiceId",
        "rate",
        "pace",
        "current",
        "advance",
        "clips",
        "steps",
      ].sort(),
    );
    expect(JSON.stringify(p)).not.toMatch(
      /confirmed|updatedAt|imageHash|pixels|caption|account|token/,
    );
  });
  test.each(["uz", "ru", "en"] as const)(
    "exact %s language with no voice-language substitution",
    (language) => {
      const p = make({ language, voice: { ...voice, lang: language } });
      expect(p.language).toBe(language);
      expect(p.steps[16].text).toBe(
        assemblyStepText(instruction, 17, language),
      );
    },
  );
  test("rejects browser-only voices, invalid positions, budgets and language mismatch", () => {
    for (const extra of [
      { voice: { ...voice, native: false } },
      { current: 0 },
      { current: 41 },
      { rate: NaN },
      { pace: 121 },
      { language: "uz" as const },
      { voice: { ...voice, id: "" } },
    ])
      expect(() => make(extra)).toThrow();
    expect(() =>
      make({
        instruction: {
          ...instruction,
          metrics: { ...instruction.metrics, lines: 41 },
        },
      }),
    ).toThrow();
  });
  test("recorded phrases deduplicate exact local clips and repeat mode never advances", () => {
    const clips = Object.fromEntries(
      Object.keys(requiredVoiceClips("en")).map((id) => [
        id,
        {
          path: `/voices/en/instructor-a/${id}.wav`,
          sha256: "a".repeat(64),
          bytes: 100,
          durationMs: 100,
        },
      ]),
    );
    const recorded = {
      id: "recorded:en:instructor-a",
      name: "A",
      lang: "en" as const,
      instructor: "instructor-a" as const,
      clips,
    };
    const p = make({
      voice: { ...voice, native: false, recorded },
      advance: false,
    });
    expect(p.voiceId).toBe("");
    expect(p.advance).toBe(false);
    expect(new Set(p.clips.map((c) => c.path)).size).toBe(p.clips.length);
    expect(p.steps.every((s) => s.clips.length > 0)).toBe(true);
    expect(p.steps.every((s) => s.clips.every((id) => p.clips[id]))).toBe(true);
    const first = Object.keys(clips)[0];
    clips[first].path = "https://example.com/voice.wav";
    expect(() => make({ voice: { ...voice, recorded } })).toThrow();
  });
});
describe("native assembly ownership", () => {
  test("late start after stop cannot resume or announce; stop has a higher native request barrier", async () => {
    const a = adapter(),
      changed = vi.fn(),
      failed = vi.fn(),
      pending = deferred<AssemblyAudioSnapshot>(),
      p = make();
    a.start.mockReturnValueOnce(pending.promise);
    const driver = new AssemblyAudioDriver(a, changed, failed),
      task = driver.start(p);
    expect(driver.ownsSession).toBe(true);
    await driver.stop();
    pending.resolve(state(p));
    await task;
    expect(changed).not.toHaveBeenCalled();
    expect(driver.ownsSession).toBe(false);
    expect(a.stop.mock.calls[0][0].requestId).toBeGreaterThan(
      a.start.mock.calls[0][0].requestId,
    );
    expect(failed).not.toHaveBeenCalled();
  });
  test("old session, wrong hash, impossible step and replayed revision cannot overwrite new announced position", async () => {
    const a = adapter(),
      changed = vi.fn(),
      driver = new AssemblyAudioDriver(a, changed, vi.fn()),
      old = make(),
      next = make();
    await driver.start(old);
    await driver.start(next);
    changed.mockClear();
    for (const s of [
      state(old, { revision: 90 }),
      state(next, { sequenceHash: "b".repeat(64), revision: 90 }),
      state(next, { current: 41, revision: 90 }),
      state(next),
      state(next, { active: false, playing: true, revision: 90 }),
    ])
      expect(driver.accept(s)).toBe(false);
    expect(driver.accept(state(next, { current: 18, revision: 2 }))).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0].current).toBe(18);
  });
  test("foreground reconciliation accepts native controls but cannot confirm progress", async () => {
    const a = adapter(),
      changed = vi.fn(),
      p = make(),
      driver = new AssemblyAudioDriver(a, changed, vi.fn());
    await driver.start(p);
    a.status.mockResolvedValue(
      state(p, { revision: 7, current: 28, playing: false }),
    );
    await driver.refresh();
    expect(changed.mock.lastCall![0]).toMatchObject({
      current: 28,
      playing: false,
    });
    expect(Object.keys(changed.mock.lastCall![0])).not.toContain("confirmed");
    a.command.mockResolvedValue(state(p, { revision: 8, current: 29 }));
    await driver.command("next");
    expect(a.command.mock.lastCall![0]).toMatchObject({
      session: p.session,
      sequenceHash: p.sequenceHash,
      command: "next",
    });
    expect(changed.mock.lastCall![0].current).toBe(29);
  });
  test("late status and command from replaced project are ignored", async () => {
    const a = adapter(),
      changed = vi.fn(),
      p = make(),
      next = make(),
      driver = new AssemblyAudioDriver(a, changed, vi.fn());
    await driver.start(p);
    const delayed = deferred<AssemblyAudioSnapshot>();
    a.command.mockReturnValue(delayed.promise);
    const task = driver.command("next");
    await driver.start(next);
    changed.mockClear();
    delayed.resolve(state(p, { revision: 8, current: 30 }));
    await task;
    expect(changed).not.toHaveBeenCalled();
    const refresh = deferred<AssemblyAudioSnapshot>();
    a.status.mockReturnValue(refresh.promise);
    const pending = driver.refresh();
    await driver.stop();
    refresh.resolve(state(next, { revision: 9 }));
    await pending;
    expect(changed).not.toHaveBeenCalled();
  });
  test("engine failure stops native ownership and reports a safe fallback", async () => {
    const a = adapter(),
      failed = vi.fn(),
      driver = new AssemblyAudioDriver(a, vi.fn(), failed);
    a.start.mockRejectedValue(new Error("unavailable"));
    await driver.start(make());
    expect(driver.ownsSession).toBe(false);
    expect(a.stop).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledTimes(1);
  });
  test("a vanished native service cannot leave the foreground UI playing", async () => {
    const a = adapter(),
      failed = vi.fn(),
      driver = new AssemblyAudioDriver(a, vi.fn(), failed),
      p = make();
    await driver.start(p);
    a.status.mockResolvedValue(
      state(p, {
        session: "",
        sequenceHash: "",
        active: false,
        playing: false,
      }),
    );
    await driver.refresh();
    expect(driver.ownsSession).toBe(false);
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
