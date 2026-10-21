import { expect, it } from "vitest";
import {
  AnalyticsDriver,
  type AnalyticsTransport,
} from "../src/analytics-driver";
import type {
  AnalyticsEvent,
  AnalyticsPreferences,
} from "../src/analytics-types";
const choice = (enabled = true, revision = 1): AnalyticsPreferences => ({
  revision,
  enabled,
  since: enabled ? Date.now() : null,
  retentionDays: 90,
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
function setup() {
  let identity: string | null = "A";
  const sent: { event: AnalyticsEvent; token: string }[] = [],
    transport: AnalyticsTransport = {
      identity: () => identity,
      preferences: async () => choice(),
      guides: async () => ["a".repeat(64)],
      send: async (event, token) => {
        sent.push({ event: structuredClone(event), token });
      },
    };
  const driver = new AnalyticsDriver(transport);
  return {
    driver,
    transport,
    sent,
    setIdentity: (v: string | null) => {
      identity = v;
    },
  };
}
it("never records before an explicit live consent response, creates no account and does not backfill earlier events", async () => {
  const x = setup(),
    pending = deferred<AnalyticsPreferences>();
  x.transport.preferences = () => pending.promise;
  expect(x.driver.record({ kind: "photo-selected", shape: "circle" })).toBe(
    false,
  );
  const loading = x.driver.refresh();
  expect(x.driver.record({ kind: "preview-ready", shape: "circle" })).toBe(
    false,
  );
  pending.resolve(choice());
  await loading;
  await x.driver.flush();
  expect(x.sent).toHaveLength(0);
  expect(x.driver.record({ kind: "photo-selected", shape: "circle" })).toBe(
    true,
  );
  await x.driver.flush();
  expect(x.sent).toHaveLength(1);
  x.setIdentity(null);
  await x.driver.refresh();
  expect(x.driver.record({ kind: "photo-selected", shape: "circle" })).toBe(
    false,
  );
});
it("constructs fixed payloads only and drops invalid shapes, text metadata and unknown event kinds", async () => {
  const x = setup();
  await x.driver.refresh();
  x.driver.record({
    kind: "photo-selected",
    shape: "square",
    photo: "PRIVATE PHOTO",
    name: "PRIVATE NAME",
    url: "PRIVATE URL",
  } as never);
  await x.driver.flush();
  expect(x.sent[0].event).toMatchObject({
    kind: "photo-selected",
    shape: "square",
    consentRevision: 1,
  });
  expect(JSON.stringify(x.sent)).not.toContain("PRIVATE");
  expect(x.driver.record({ kind: "preview-ready", shape: "rectangle" })).toBe(
    true,
  );
  await x.driver.flush();
  expect(x.sent[1].event).toMatchObject({ shape: "square" });
  for (const input of [
    { kind: "photo-selected", shape: "custom text" },
    { kind: "page-view", shape: "circle" },
    { kind: "photo-selected", shape: { private: "photo" } },
  ])
    expect(x.driver.record(input as never)).toBe(false);
});
it("late consent and owned-guide responses cannot enable another account or disclose an old local guide hash", async () => {
  const x = setup(),
    old = deferred<AnalyticsPreferences>();
  x.transport.preferences = () => old.promise;
  const loading = x.driver.refresh();
  x.setIdentity("B");
  x.transport.preferences = async () => choice(false, 0);
  await x.driver.refresh();
  old.resolve(choice());
  await loading;
  expect(x.driver.record({ kind: "photo-selected", shape: "circle" })).toBe(
    false,
  );
  const guides = deferred<string[]>();
  x.setIdentity("A");
  x.transport.preferences = async () => choice();
  x.transport.guides = () => guides.promise;
  const first = x.driver.refresh();
  await Promise.resolve();
  await Promise.resolve();
  x.setIdentity("B");
  x.transport.guides = async () => ["b".repeat(64)];
  await x.driver.refresh();
  guides.resolve(["a".repeat(64)]);
  await first;
  expect(
    x.driver.record({
      kind: "assembly-confirmed",
      sequenceHash: "a".repeat(64),
      revision: 1,
      confirmed: 1,
      total: 3000,
    }),
  ).toBe(false);
  expect(x.sent).toHaveLength(0);
});
it("samples actual owned manual confirmations and explicit undo corrections; does not mutate local progress", async () => {
  const x = setup();
  await x.driver.refresh();
  const input = {
      kind: "assembly-confirmed" as const,
      sequenceHash: "a".repeat(64),
      revision: 1,
      confirmed: 1,
      total: 3000,
    },
    copy = structuredClone(input);
  expect(x.driver.record({ ...input, sequenceHash: "b".repeat(64) })).toBe(
    false,
  );
  expect(x.driver.record(input)).toBe(true);
  expect(input).toEqual(copy);
  expect(x.driver.record({ ...input, revision: 2, confirmed: 2 })).toBe(true);
  expect(x.driver.record({ ...input, revision: 3, confirmed: 3 })).toBe(false);
  expect(x.driver.record({ ...input, revision: 4, confirmed: 300 })).toBe(true);
  expect(x.driver.record({ ...input, revision: 5, confirmed: 3000 })).toBe(
    true,
  );
  expect(
    x.driver.record({ ...input, revision: 6, confirmed: 2999 }, true),
  ).toBe(true);
  await x.driver.flush();
  expect(
    x.sent.map((r) =>
      r.event.kind === "assembly-confirmed" ? r.event.confirmed : -1,
    ),
  ).toEqual([1, 2, 300, 3000, 2999]);
  for (const change of [
    { revision: 0 },
    { confirmed: 3001 },
    { total: 20001 },
    { confirmed: NaN },
  ])
    expect(x.driver.record({ ...input, ...change })).toBe(false);
});
it("a lost response permits one exact request retry; denied/stale consent and quotas never loop", async () => {
  const x = setup();
  await x.driver.refresh();
  let calls = 0;
  const bodies: AnalyticsEvent[] = [];
  x.transport.send = async (event) => {
    bodies.push(structuredClone(event));
    if (++calls === 1) throw new TypeError("Offline");
  };
  x.driver.record({ kind: "preview-ready", shape: "heart" });
  await x.driver.flush();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  for (const status of [401, 403, 409, 429]) {
    const y = setup();
    await y.driver.refresh();
    let count = 0;
    y.transport.send = async () => {
      count++;
      throw { status };
    };
    y.driver.record({ kind: "photo-selected", shape: "circle" });
    await y.driver.flush();
    expect(count).toBe(1);
    if (status !== 429)
      expect(y.driver.record({ kind: "preview-ready", shape: "circle" })).toBe(
        false,
      );
  }
});
it("pause/erase/account change drops bounded unsent jobs and prevents an old failed request retry", async () => {
  const x = setup();
  await x.driver.refresh();
  const pending = deferred<void>();
  let count = 0;
  x.transport.send = async () => {
    count++;
    await pending.promise;
    throw new TypeError("Lost response");
  };
  x.driver.record({ kind: "photo-selected", shape: "circle" });
  for (let i = 0; i < 100; i++)
    x.driver.record({ kind: "preview-ready", shape: "circle" });
  x.driver.pause();
  x.setIdentity("B");
  pending.resolve();
  await x.driver.flush();
  expect(count).toBe(1);
  expect(x.driver.record({ kind: "photo-selected", shape: "heart" })).toBe(
    false,
  );
  expect(x.sent).toHaveLength(0);
});
it("failed/off/invalid preferences never collect, and failed ownership lookup never guesses guide ownership", async () => {
  for (const result of [choice(false, 0), { ...choice(), retentionDays: 7 }]) {
    const x = setup();
    x.transport.preferences = async () => result as AnalyticsPreferences;
    await x.driver.refresh();
    expect(x.driver.record({ kind: "photo-selected", shape: "circle" })).toBe(
      false,
    );
  }
  const x = setup();
  x.transport.preferences = async () => {
    throw new Error("Offline");
  };
  await x.driver.refresh();
  expect(x.driver.record({ kind: "photo-selected", shape: "circle" })).toBe(
    false,
  );
  x.transport.preferences = async () => choice();
  x.transport.guides = async () => {
    throw new Error("Offline");
  };
  await x.driver.refresh();
  expect(
    x.driver.record({
      kind: "assembly-confirmed",
      sequenceHash: "a".repeat(64),
      revision: 1,
      confirmed: 1,
      total: 3000,
    }),
  ).toBe(false);
});
it("a source action binds the consent/account at its start and cannot backfill a pre-consent or previous-account preview", async () => {
  const x = setup(),
    before = x.driver.capture();
  await x.driver.refresh();
  expect(before({ kind: "preview-ready", shape: "circle" })).toBe(false);
  const previous = x.driver.capture();
  x.setIdentity("B");
  await x.driver.refresh();
  expect(previous({ kind: "preview-ready", shape: "heart" })).toBe(false);
  expect(x.sent).toHaveLength(0);
  const active = x.driver.capture();
  expect(active({ kind: "photo-selected", shape: "square" })).toBe(true);
  await x.driver.flush();
  expect(x.sent[0].token).toBe("B");
});
it("the first manual confirmation refreshes actual owned unlocks without sending an unowned or previous-account hash", async () => {
  const x = setup();
  let guides: string[] = [],
    reads = 0;
  x.transport.guides = async () => {
    reads++;
    return guides;
  };
  await x.driver.refresh();
  guides = ["c".repeat(64)];
  const input = {
    kind: "assembly-confirmed" as const,
    sequenceHash: "c".repeat(64),
    revision: 1,
    confirmed: 1,
    total: 3000,
  };
  expect(await x.driver.manual(input)).toBe(true);
  await x.driver.flush();
  expect(x.sent).toHaveLength(1);
  const unknown = { ...input, sequenceHash: "d".repeat(64) };
  expect(await x.driver.manual(unknown)).toBe(false);
  const before = reads;
  expect(await x.driver.manual(unknown)).toBe(false);
  expect(reads).toBe(before);
  const y = setup(),
    held = deferred<string[]>();
  y.transport.guides = async () => [];
  await y.driver.refresh();
  y.transport.guides = () => held.promise;
  const pending = y.driver.manual(input);
  y.setIdentity("B");
  y.driver.pause();
  held.resolve(["c".repeat(64)]);
  expect(await pending).toBe(false);
  expect(y.sent).toHaveLength(0);
});
