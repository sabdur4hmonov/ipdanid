import { expect, test } from "vitest";
import { newerAudioPosition } from "../src/assembly-audio-resume";
import {
  validAssemblySession,
  type AssemblySession,
} from "../src/assembly-session";
import { assemblyAudioText } from "../src/assembly-audio-i18n";
import type { Project } from "../src/core/types";
import { customerError } from "../src/errors";
const now = 1900000000000;
const saved: AssemblySession = {
  version: 1,
  projectId: "p",
  sequenceHash: "a".repeat(64),
  current: 17,
  pace: 8,
  updatedAt: now - 5000,
};
const fresh = {
  projectId: "p",
  sequenceHash: saved.sequenceHash,
  current: 28,
  updatedAt: now - 1000,
};
test("native background cursor wins only for the same surviving project and a newer local timestamp", () => {
  expect(newerAudioPosition(saved, fresh, 3000, now)).toBe(28);
  expect(
    newerAudioPosition({ ...saved, updatedAt: undefined }, fresh, 3000, now),
  ).toBe(28);
  expect(saved.current).toBe(17);
});
test("old, future, expired, wrong-project, wrong-guide and impossible native positions never override the foreground cursor", () => {
  for (const patch of [
    { updatedAt: saved.updatedAt },
    { updatedAt: now - 8 * 86400000 },
    { updatedAt: now + 60001 },
    { updatedAt: NaN },
    { projectId: "p2" },
    { sequenceHash: "b".repeat(64) },
    { current: 0 },
    { current: 3001 },
    { current: 1.5 },
  ])
    expect(
      newerAudioPosition(saved, { ...fresh, ...patch }, 3000, now),
    ).toBeUndefined();
  expect(newerAudioPosition(saved, null, 3000, now)).toBeUndefined();
});
test("additive session timestamps preserve historical version1 sessions and reject malformed metadata", () => {
  const projects = [
    {
      id: "p",
      instruction: {
        sequenceHash: saved.sequenceHash,
        metrics: { lines: 3000 },
      },
    },
  ] as Project[];
  expect(validAssemblySession(saved, projects)).toEqual(saved);
  const { updatedAt: _, ...legacy } = saved;
  expect(validAssemblySession(legacy, projects)).toEqual(legacy);
  for (const updatedAt of [-1, NaN, 1.3])
    expect(
      validAssemblySession({ ...saved, updatedAt }, projects),
    ).toBeUndefined();
});
test("background controls and fallback instructions cover four actual UI locales", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    for (const key of [
      "enable",
      "hint",
      "unsupported",
      "needVoice",
      "failed",
    ] as const)
      expect(assemblyAudioText(locale, key).length).toBeGreaterThan(10);
  expect(assemblyAudioText("uz-Cyrl", "enable")).toMatch(/[а-я]/);
  expect(assemblyAudioText("uz-Cyrl", "enable")).not.toBe(
    assemblyAudioText("uz", "enable"),
  );
});
test("only the fixed audio error tag exposes its localized recovery message", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    expect(customerError("assembly-audio/unavailable", locale)).toBe(
      assemblyAudioText(locale, "failed"),
    );
  expect(
    customerError("untrusted native body with private-token", "en"),
  ).not.toContain("private-token");
});
