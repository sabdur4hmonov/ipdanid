import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { CustomerStore } from "../server/customer-store";
import { RecoveryStore, recoveryWrite } from "../server/recovery-store";
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import type { Instruction } from "../src/core/types";
import type { RecoveryWrite } from "../src/recovery-types";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";

let guide: Instruction;
beforeAll(async () => {
  guide = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
  });
});
const stores: CustomerStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup(path = ":memory:") {
  const s = new CustomerStore(path, "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  const r = new RecoveryStore(s),
    user = s.createGuest();
  const code = s.issueCode(
    "dev-circle-120-dark",
    2,
    Date.now() + 60000,
    "admin",
  );
  s.redeemCode(user.id, code.code);
  const job = s.reserveGeneration(user.id, "save", guide.sequenceHash);
  s.finishGeneration(user.id, job.id, guide);
  const id = String(s.instructions(user.id)[0].id);
  const body: RecoveryWrite = {
    sequenceHash: guide.sequenceHash,
    confirmed: 4,
    expectedRevision: 0,
    requestKey: "test-recovery-request-01",
    resume: { current: 17, pace: 8, resting: true },
    library: {
      name: "My portrait",
      folder: "Gifts",
      bookmarks: [{ step: 12, label: "Check tension" }],
    },
  };
  return { s, r, user: user.id, id, body };
}
describe("account recovery uses one atomic progress revision", () => {
  it("restores exact rest cursor independently of manual confirmation, immutable guide and credits", () => {
    const { s, r, user, id, body } = setup(),
      before = s.instruction(user, id);
    expect(r.read(user, id).details).toBeNull();
    const result = r.save(user, id, body);
    expect(result.progress).toMatchObject({ confirmed: 4, revision: 1 });
    expect(result.details).toEqual({
      resume: body.resume,
      library: body.library,
    });
    expect(r.read(user, id)).toEqual(result);
    expect(s.balance(user)).toBe(1);
    expect(s.instruction(user, id)).toEqual(before);
  });
  it("same password on a new client restores the same ownership and state", () => {
    const { s, r, user, id, body } = setup();
    const a = s.register(
      user,
      "recovery@example.invalid",
      "Synthetic-password-123!",
    );
    r.save(a.id, id, body);
    const b = s.login(a.email, "Synthetic-password-123!");
    expect(s.authenticate(b.token)).toBe(user);
    expect(r.read(b.id, id).details?.resume?.current).toBe(17);
    expect(s.balance(b.id)).toBe(1);
  });
  it("lost-response retry is stable, reordered keys are allowed, changed content conflicts", () => {
    const { r, user, id, body } = setup(),
      saved = r.save(user, id, body);
    expect(
      r.save(user, id, {
        ...body,
        library: {
          bookmarks: body.library.bookmarks,
          folder: "Gifts",
          name: "My portrait",
        },
      }),
    ).toEqual(saved);
    expect(() => r.save(user, id, { ...body, confirmed: 5 })).toThrow(
      /conflict/,
    );
    expect(r.read(user, id)).toEqual(saved);
  });
  it("stale second device cannot overwrite a later cursor or rewind confirmed work silently", () => {
    const { r, user, id, body } = setup();
    r.save(user, id, body);
    r.save(user, id, {
      ...body,
      confirmed: 6,
      expectedRevision: 1,
      requestKey: "test-recovery-request-02",
      resume: { current: 20, pace: 9, resting: false },
    });
    expect(() => r.save(user, id, body)).toThrow(/conflict/);
    expect(() =>
      r.save(user, id, { ...body, requestKey: "test-recovery-request-03" }),
    ).toThrow(/conflict/);
    expect(r.read(user, id).progress.confirmed).toBe(6);
  });
  it("legacy progress clients invalidate incompatible cursor metadata and old retries", () => {
    const { s, r, user, id, body } = setup(),
      saved = r.save(user, id, body);
    s.saveProgress(user, id, { ...saved.progress, confirmed: 8 }, 1);
    expect(r.read(user, id)).toMatchObject({
      progress: { confirmed: 8, revision: 2 },
      details: null,
    });
    expect(() => r.save(user, id, body)).toThrow(/conflict/);
  });
  it("denies cross-account reads, writes and retry even for a known instruction id", () => {
    const { s, r, user, id, body } = setup();
    r.save(user, id, body);
    const other = s.createGuest().id;
    expect(() => r.read(other, id)).toThrow(/not found/);
    expect(() => r.save(other, id, body)).toThrow(/not found/);
  });
  it("tombstoned project cannot be read or resurrected by a saved request", () => {
    const { s, r, user, id, body } = setup();
    r.save(user, id, body);
    s.db
      .prepare(
        "UPDATE projects SET deleted_at=? WHERE id=(SELECT project_id FROM instructions WHERE id=?)",
      )
      .run(new Date().toISOString(), id);
    expect(() => r.read(user, id)).toThrow(/not found/);
    expect(() => r.save(user, id, body)).toThrow(/not found/);
  });
  it("rolls manual progress back when metadata persistence fails", () => {
    const { s, r, user, id, body } = setup();
    s.db.exec(
      "CREATE TRIGGER fail_recovery BEFORE INSERT ON account_recovery BEGIN SELECT RAISE(ABORT,'injected write failure'); END;",
    );
    expect(() => r.save(user, id, body)).toThrow(/injected/);
    expect(s.progress(user, id).revision).toBe(0);
    s.db.exec("DROP TRIGGER fail_recovery");
    expect(r.save(user, id, body).progress.revision).toBe(1);
  });
  it("survives database reopen and repeated additive initialization", () => {
    mkdirSync("test-results", { recursive: true });
    const path = join(mkdtempSync("test-results/recovery-"), "database.sqlite");
    const { s, r, user, id, body } = setup(path),
      saved = r.save(user, id, body);
    s.close();
    stores.splice(stores.indexOf(s), 1);
    const reopened = new CustomerStore(path, "p".repeat(32), "k".repeat(32));
    stores.push(reopened);
    expect(new RecoveryStore(reopened).read(user, id)).toEqual(saved);
    expect(new RecoveryStore(reopened).save(user, id, body)).toEqual(saved);
  });
  it("accepts explicit absence of a cursor without inventing confirmed work", () => {
    const { r, user, id, body } = setup();
    expect(
      r.save(user, id, { ...body, resume: null }).details?.resume,
    ).toBeNull();
  });
  it("rejects unbounded, malformed and private extra fields before any write", () => {
    const { r, user, id, body } = setup();
    const bad: unknown[] = [
      null,
      [],
      { ...body, photo: "private" },
      { ...body, confirmed: 41 },
      { ...body, expectedRevision: NaN },
      { ...body, requestKey: "short" },
      { ...body, sequenceHash: "wrong" },
      { ...body, resume: { ...body.resume, current: 0 } },
      { ...body, resume: { ...body.resume, pace: Infinity } },
      { ...body, resume: { ...body.resume, resting: 1 } },
      { ...body, resume: { ...body.resume, playing: true } },
      { ...body, library: { ...body.library, name: "x".repeat(121) } },
      { ...body, library: { ...body.library, folder: "a\n" } },
      {
        ...body,
        library: {
          ...body.library,
          bookmarks: Array(101).fill({ step: 1, label: "" }),
        },
      },
      {
        ...body,
        library: {
          ...body.library,
          bookmarks: [
            { step: 1, label: "" },
            { step: 1, label: "duplicate" },
          ],
        },
      },
    ];
    for (const input of bad) expect(() => r.save(user, id, input)).toThrow();
    expect(r.read(user, id).progress.revision).toBe(0);
    expect(recoveryWrite(body, guide.sequenceHash, 40)).toEqual(body);
  });
});
