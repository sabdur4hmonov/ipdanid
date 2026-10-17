import { spokenPin } from "../src/i18n";
import { test, expect } from "vitest";
import { validAssemblySession } from "../src/assembly-session";
import { ScreenAwakeLease } from "../src/screen-awake";
import type { Project } from "../src/core/types";
import { spokenKitPin } from "../src/sector-speech";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
const projects = [
  {
    id: "p",
    instruction: { sequenceHash: "a".repeat(64), metrics: { lines: 3000 } },
  },
] as Project[];
const saved = {
  version: 1,
  projectId: "p",
  sequenceHash: "a".repeat(64),
  current: 71,
  pace: 8,
};
test("resume cursor is bound to exact surviving guide; never changes confirmed progress", () => {
  expect(validAssemblySession(saved, projects)).toEqual(saved);
  for (const change of [
    { current: 0 },
    { current: 3001 },
    { current: 1.5 },
    { pace: 0 },
    { pace: 121 },
    { version: 2 },
    { projectId: "other" },
    { sequenceHash: "b".repeat(64) },
  ])
    expect(
      validAssemblySession({ ...saved, ...change }, projects),
    ).toBeUndefined();
  expect(
    validAssemblySession(saved, [
      { ...projects[0], deletedAt: new Date().toISOString() },
    ]),
  ).toBeUndefined();
  expect(validAssemblySession("{bad", projects)).toBeUndefined();
});
test("wake lease releases late acquisitions, navigation and failed reacquisition safely", async () => {
  let resolve!: (lease: { release(): Promise<void> }) => void;
  let markStarted!: () => void;
  const started = new Promise<void>((r) => (markStarted = r));
  let released = 0;
  const states: string[] = [];
  const lease = new ScreenAwakeLease(
    () => {
      markStarted();
      return new Promise((r) => (resolve = r));
    },
    (s) => states.push(s),
  );
  const first = lease.set(true);
  await started;
  const off = lease.set(false);
  resolve({
    release: async () => {
      released++;
    },
  });
  await first;
  await off;
  expect(released).toBe(1);
  expect(states).toEqual(["off"]);
  const failed = new ScreenAwakeLease(
    async () => {
      throw Error("unavailable");
    },
    (s) => states.push(s),
  );
  await failed.set(true);
  expect(states.at(-1)).toBe("unavailable");
  await failed.set(false);
  expect(states.at(-1)).toBe("off");
});
test("rapid visibility changes serialize one live screen lock without leaking a handle", async () => {
  let live = 0,
    peak = 0;
  const lease = new ScreenAwakeLease(async () => {
    live++;
    peak = Math.max(peak, live);
    return {
      release: async () => {
        live--;
      },
    };
  });
  await lease.set(true);
  await Promise.all([
    lease.set(false),
    lease.set(true),
    lease.set(false),
    lease.set(true),
  ]);
  expect(live).toBe(1);
  expect(peak).toBe(1);
  await lease.set(false);
  expect(live).toBe(0);
});
test("sector17 is spoken in actual UZ/RU/EN without changing its numeric identity", () => {
  const p = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0];
  expect(spokenKitPin("uz", p, 76)).toMatch(/B, .*yetti/);
  expect(spokenKitPin("ru", p, 76)).toMatch(/B, .*семнадцать/);
  expect(spokenKitPin("en", p, 76)).toMatch(/B, .*seventeen/);
});

test("failed release remains owned and is retried before the next wake acquisition", async () => {
  let releases = 0,
    requests = 0;
  const lease = new ScreenAwakeLease(async () => {
    requests++;
    return {
      release: async () => {
        if (++releases === 1) throw Error("temporary");
      },
    };
  });
  await lease.set(true);
  await lease.set(false);
  expect(requests).toBe(1);
  await lease.set(true);
  expect(releases).toBe(2);
  expect(requests).toBe(2);
  await lease.set(false);
  expect(releases).toBe(3);
});

test("long Uzbek assembly steps never say undefined after999", () => {
  expect(spokenPin("uz", 3000)).toBe("uch ming");
  expect(spokenPin("uz", 3517)).toBe("uch ming besh yuz o‘n yetti");
});
