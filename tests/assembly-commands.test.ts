import { expect, test, vi } from "vitest";
import {
  recognizedAssemblyCommand,
  commandScopeKey,
  type CommandScope,
} from "../src/assembly-command-policy";
import {
  AssemblyCommandDriver,
  type AssemblyCommandAdapter,
} from "../src/assembly-command-driver";
const candidate = (text: string, confidence = 0.95) => [{ text, confidence }];
test.each([
  ["en", "NEXT.", "next"],
  ["en", "previous step", "previous"],
  ["en", "repeat", "repeat"],
  ["en", "stop", "pause"],
  ["en", "continue", "play"],
  ["ru", "следующий шаг", "next"],
  ["ru", "назад", "previous"],
  ["ru", "повтори", "repeat"],
  ["ru", "пауза", "pause"],
  ["ru", "продолжить", "play"],
  ["uz", "keyingi qadam", "next"],
  ["uz", "oldingi", "previous"],
  ["uz", "takrorla", "repeat"],
  ["uz", "to'xta", "pause"],
  ["uz", "to‘xta", "pause"],
  ["uz", "davom et", "play"],
  ["uz", "кейинги", "next"],
  ["uz", "олдинги", "previous"],
  ["uz", "такрорла", "repeat"],
  ["uz", "тўхта", "pause"],
] as const)(
  "exact local %s phrase %s maps only to %s",
  (lang, text, command) => {
    expect(recognizedAssemblyCommand(candidate(text), lang)).toBe(command);
  },
);
test.each([
  "confirm",
  "done",
  "tasdiqla",
  "готово",
  "unlock",
  "buy",
  "please next",
  "next and confirm",
  "ne\u200bxt",
  "next\n",
  "next!!",
  "x".repeat(81),
])("unlisted/noisy/hidden phrase %s cannot run an action", (text) => {
  expect(recognizedAssemblyCommand(candidate(text), "en")).toBeUndefined();
});
test("low/missing/invalid confidence and conflicting alternatives are rejected, with no language substitution", () => {
  for (const confidence of [0.879, -1, NaN, Infinity, 1.1])
    expect(
      recognizedAssemblyCommand(candidate("next", confidence), "en"),
    ).toBeUndefined();
  expect(recognizedAssemblyCommand([{ text: "next" }], "en")).toBeUndefined();
  expect(
    recognizedAssemblyCommand([{ text: "next", confidence: ".99" }], "en"),
  ).toBeUndefined();
  expect(
    recognizedAssemblyCommand(
      [...candidate("next"), ...candidate("pause", 0.6)],
      "en",
    ),
  ).toBeUndefined();
  expect(
    recognizedAssemblyCommand(
      [...candidate("next"), ...candidate("unknown", 0.7)],
      "en",
    ),
  ).toBeUndefined();
  expect(
    recognizedAssemblyCommand(
      [...candidate("next"), ...candidate("next step", 0.8)],
      "en",
    ),
  ).toBe("next");
  expect(
    recognizedAssemblyCommand(
      [...candidate("next"), ...candidate("pause", 0.4)],
      "en",
    ),
  ).toBe("next");
  expect(recognizedAssemblyCommand(candidate("next", 0.88), "en")).toBe("next");
  expect(
    recognizedAssemblyCommand(candidate("следующий"), "en"),
  ).toBeUndefined();
  expect(
    recognizedAssemblyCommand(Array(4).fill(candidate("next")[0]), "en"),
  ).toBeUndefined();
});
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
function fixture() {
  const adapter = {
    capabilities: vi.fn<AssemblyCommandAdapter["capabilities"]>(async () => ({
      supported: true,
    })),
    permission: vi.fn<AssemblyCommandAdapter["permission"]>(async () => ({
      granted: true,
    })),
    listen: vi.fn<AssemblyCommandAdapter["listen"]>(async (o) => ({
      session: o.session,
      status: "result",
      alternatives: candidate("next"),
    })),
    cancel: vi.fn<AssemblyCommandAdapter["cancel"]>(async () => {}),
  };
  const live: { scope: CommandScope | undefined; now: number } = {
    scope: {
      projectId: "p",
      sequenceHash: "a".repeat(64),
      current: 7,
      total: 80,
      language: "en",
    },
    now: 0,
  };
  const action = vi.fn(),
    state = vi.fn();
  const driver = new AssemblyCommandDriver(
    adapter,
    () => live.scope,
    action,
    state,
    () => live.now,
  );
  return { adapter, live, action, state, driver };
}
test("only one bounded navigation command dispatches, and no confirmation or private scope travels to recognition", async () => {
  const f = fixture();
  await f.driver.listen();
  expect(f.action).toHaveBeenCalledExactlyOnceWith("next");
  const request = f.adapter.listen.mock.calls[0][0];
  expect(Object.keys(request).sort()).toEqual(
    ["controller", "requestId", "session", "language"].sort(),
  );
  expect(f.state.mock.lastCall).toEqual(["heard", "next"]);
  expect(f.adapter.cancel.mock.lastCall![0].requestId).toBeGreaterThan(
    request.requestId,
  );
});
test("unsupported recognition and denied permission never activate the microphone", async () => {
  const f = fixture();
  f.adapter.capabilities.mockResolvedValue({ supported: false });
  await f.driver.listen();
  expect(f.adapter.permission).not.toHaveBeenCalled();
  expect(f.adapter.listen).not.toHaveBeenCalled();
  f.adapter.capabilities.mockResolvedValue({ supported: true });
  f.adapter.permission.mockResolvedValue({ granted: false });
  await f.driver.listen();
  expect(f.adapter.listen).not.toHaveBeenCalled();
  expect(f.action).not.toHaveBeenCalled();
  expect(f.state.mock.lastCall).toEqual(["manual"]);
});
test("late permission after cancellation or a changed step cannot start recording", async () => {
  const f = fixture(),
    permission = deferred<{ granted: boolean }>();
  f.adapter.permission.mockReturnValue(permission.promise);
  const task = f.driver.listen();
  await vi.waitFor(() => expect(f.adapter.permission).toHaveBeenCalled());
  f.driver.cancel();
  permission.resolve({ granted: true });
  await task;
  expect(f.adapter.listen).not.toHaveBeenCalled();
  expect(f.action).not.toHaveBeenCalled();
  const next = deferred<{ granted: boolean }>();
  f.adapter.permission.mockReturnValue(next.promise);
  const pending = f.driver.listen();
  await vi.waitFor(() => expect(f.adapter.permission).toHaveBeenCalledTimes(2));
  f.live.scope = { ...f.live.scope!, current: 8 };
  next.resolve({ granted: true });
  await pending;
  expect(f.adapter.listen).not.toHaveBeenCalled();
});
test("native ready/results from a cancelled or replaced guide are ignored", async () => {
  const f = fixture(),
    response =
      deferred<Awaited<ReturnType<AssemblyCommandAdapter["listen"]>>>();
  f.adapter.listen.mockReturnValue(response.promise);
  const task = f.driver.listen();
  await vi.waitFor(() => expect(f.adapter.listen).toHaveBeenCalled());
  const { session } = f.adapter.listen.mock.calls[0][0];
  f.driver.ready(session);
  expect(f.state.mock.lastCall).toEqual(["listening"]);
  f.driver.cancel();
  f.driver.ready(session);
  expect(f.state.mock.lastCall).toEqual(["off"]);
  response.resolve({
    session,
    status: "result",
    alternatives: candidate("next"),
  });
  await task;
  expect(f.action).not.toHaveBeenCalled();
  const next =
    deferred<Awaited<ReturnType<AssemblyCommandAdapter["listen"]>>>();
  f.adapter.listen.mockReturnValue(next.promise);
  const pending = f.driver.listen();
  await vi.waitFor(() => expect(f.adapter.listen).toHaveBeenCalledTimes(2));
  const s = f.adapter.listen.mock.lastCall![0].session;
  f.live.scope = { ...f.live.scope!, sequenceHash: "b".repeat(64) };
  next.resolve({
    session: s,
    status: "result",
    alternatives: candidate("next"),
  });
  await pending;
  expect(f.action).not.toHaveBeenCalled();
});
test("expired capability/permission/capture results and mismatched sessions have no action", async () => {
  for (const phase of [
    "capability",
    "permission",
    "capture",
    "session",
  ] as const) {
    const f = fixture();
    if (phase === "capability")
      f.adapter.capabilities.mockImplementation(async () => {
        f.live.now = 31000;
        return { supported: true };
      });
    if (phase === "permission")
      f.adapter.permission.mockImplementation(async () => {
        f.live.now = 31000;
        return { granted: true };
      });
    if (phase === "capture" || phase === "session")
      f.adapter.listen.mockImplementation(async (o) => {
        if (phase === "capture") f.live.now = 10001;
        return {
          session: phase === "session" ? crypto.randomUUID() : o.session,
          status: "result",
          alternatives: candidate("next"),
        };
      });
    await f.driver.listen();
    expect(f.action).not.toHaveBeenCalled();
    if (phase !== "capture" && phase !== "session")
      expect(f.adapter.listen).not.toHaveBeenCalled();
  }
});
test("first/last-step boundaries, unknown voice and model failure fall back to manual control", async () => {
  for (const [current, text] of [
    [1, "previous"],
    [80, "next"],
    [7, "confirm"],
  ] as const) {
    const f = fixture();
    f.live.scope = { ...f.live.scope!, current };
    f.adapter.listen.mockImplementation(async (o) => ({
      session: o.session,
      status: "result",
      alternatives: candidate(text),
    }));
    await f.driver.listen();
    expect(f.action).not.toHaveBeenCalled();
  }
  const f = fixture();
  f.adapter.listen.mockRejectedValue(Error("Installed model unavailable"));
  await f.driver.listen();
  expect(f.action).not.toHaveBeenCalled();
  expect(f.state.mock.lastCall).toEqual(["manual"]);
});
test("invalid or missing guide scopes do not request permission", async () => {
  const f = fixture();
  f.live.scope = undefined;
  await f.driver.listen();
  expect(f.adapter.permission).not.toHaveBeenCalled();
  expect(
    commandScopeKey({
      projectId: "p",
      sequenceHash: "a".repeat(64),
      current: 0,
      total: 80,
      language: "en",
    }),
  ).toBeUndefined();
});
