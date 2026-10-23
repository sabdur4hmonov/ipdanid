import { afterEach, describe, expect, it } from "vitest";
import { CustomerStore } from "../server/customer-store";
import { PhotoBackupStore } from "../server/photo-backup-store";
import {
  encodePhotoDraft,
  DRAFT_TTL,
  type PhotoDraft,
} from "../src/photo-draft";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
const stores: CustomerStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup(maxBytes?: number) {
  const s = new CustomerStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  const guest = s.createGuest(),
    user = s.register(
      guest.id,
      crypto.randomUUID() + "@example.invalid",
      "Synthetic-password-123!",
    );
  return { s, user, r: new PhotoBackupStore(s, maxBytes) };
}
async function body(now = Date.now()) {
  const d: PhotoDraft = {
    version: "editable-photo/1",
    savedAt: now,
    width: 2,
    height: 2,
    rgba: new Uint8Array(16).fill(128),
    maskEdited: true,
    analysis: {
      mask: { width: 2, height: 2, values: new Float32Array([0, 0.3, 0.7, 1]) },
      faces: [],
      faceUnavailable: true,
      cleanupUnavailable: true,
    },
    kind: "people",
    shape: "heart",
    caption: "Ali",
    adjustment: { x: 0.1, y: 0.2, zoom: 1.6 },
    rotation: 1,
    lines: 3000,
    config: structuredClone(DEFAULT_STANDARD_KIT),
  };
  return {
    consent: "private-photo-backup/1" as const,
    expectedRevision: 0,
    requestKey: crypto.randomUUID(),
    archive: Buffer.from(await encodePhotoDraft(d, now)).toString("base64"),
  };
}
describe("private account photo backup", () => {
  it("keeps one exact owned archive across logins, without credits or public media", async () => {
    const { s, user, r } = setup(),
      b = await body();
    const saved = await r.save(user.id, b);
    expect(saved).toMatchObject({ available: true, revision: 1 });
    const second = s.login(user.email, "Synthetic-password-123!");
    expect(r.read(second.id).archive).toBe(b.archive);
    expect(s.balance(user.id)).toBe(0);
    expect(s.db.prepare("SELECT count(*) AS n FROM media").get()?.n).toBe(0);
  });
  it("requires explicit specific consent, a durable account and exact fields", async () => {
    const { s, user, r } = setup(),
      b = await body();
    for (const patch of [
      { consent: false },
      { consent: "gallery/1" },
      { token: "no" },
      { expectedRevision: -1 },
      { requestKey: "short" },
      { archive: "not-base64" },
    ])
      await expect(r.save(user.id, { ...b, ...patch })).rejects.toThrow();
    await expect(r.save(s.createGuest().id, b)).rejects.toThrow();
    expect(r.status(user.id).available).toBe(false);
  });
  it("exact retry is stable, changed retry/stale second client conflicts", async () => {
    const { user, r } = setup(),
      b = await body(),
      first = await r.save(user.id, b);
    expect(await r.save(user.id, b)).toEqual(first);
    await expect(
      r.save(user.id, { ...b, archive: (await body()).archive }),
    ).rejects.toThrow();
    await expect(
      r.save(user.id, { ...b, requestKey: crypto.randomUUID() }),
    ).rejects.toThrow();
  });
  it("deletion leaves a revision fence and cannot be undone by a delayed accepted upload", async () => {
    const { user, r } = setup(),
      b = await body();
    await r.save(user.id, b);
    const del = { expectedRevision: 1, requestKey: crypto.randomUUID() };
    expect(r.remove(user.id, del)).toMatchObject({
      available: false,
      revision: 2,
    });
    expect(r.remove(user.id, del).revision).toBe(2);
    expect(() => r.read(user.id)).toThrow();
    await expect(r.save(user.id, b)).rejects.toThrow();
    expect(
      (
        await r.save(user.id, {
          ...b,
          expectedRevision: 2,
          requestKey: crypto.randomUUID(),
        })
      ).revision,
    ).toBe(3);
  });
  it("expiry scrubs the blob and fences retries without renewing retention", async () => {
    const { s, user, r } = setup(),
      now = Date.now(),
      b = await body(now);
    await r.save(user.id, b, () => {}, now);
    r.prune(now + DRAFT_TTL);
    expect(r.status(user.id, now + DRAFT_TTL)).toMatchObject({
      available: false,
      revision: 2,
    });
    expect(
      s.db
        .prepare("SELECT archive FROM photo_backups WHERE user_id=?")
        .get(user.id)?.archive,
    ).toBeNull();
    await expect(
      r.save(user.id, b, () => {}, now + DRAFT_TTL),
    ).rejects.toThrow();
  });
  it("foreign accounts cannot read or delete a copy; no caller-supplied owner id is accepted", async () => {
    const { s, user, r } = setup(),
      b = await body();
    await r.save(user.id, b);
    const g = s.createGuest(),
      other = s.register(
        g.id,
        crypto.randomUUID() + "@example.invalid",
        "Synthetic-password-123!",
      );
    expect(() => r.read(other.id)).toThrow();
    expect(() =>
      r.remove(other.id, {
        expectedRevision: 1,
        requestKey: crypto.randomUUID(),
      }),
    ).toThrow();
    await expect(r.save(other.id, { ...b, user: user.id })).rejects.toThrow();
    expect(r.read(user.id).archive).toBe(b.archive);
  });
  it("global byte quota refuses a write without damaging the previous copy", async () => {
    const { s, user, r } = setup(1),
      b = await body();
    await expect(r.save(user.id, b)).rejects.toThrow();
    expect(r.status(user.id).revision).toBe(0);
    const allowed = new PhotoBackupStore(
      s,
      Buffer.from(b.archive, "base64").length,
    );
    await allowed.save(user.id, b);
    await expect(
      r.save(user.id, {
        ...b,
        expectedRevision: 1,
        requestKey: crypto.randomUUID(),
      }),
    ).rejects.toThrow();
    expect(allowed.read(user.id).archive).toBe(b.archive);
  });
  it("rechecks authorization after asynchronous validation and rolls back write failures", async () => {
    const { s, user, r } = setup(),
      b = await body();
    await expect(
      r.save(user.id, b, () => {
        throw Error("session revoked");
      }),
    ).rejects.toThrow("session revoked");
    expect(r.status(user.id).revision).toBe(0);
    s.db.exec(
      "CREATE TRIGGER fail_backup BEFORE INSERT ON photo_backups BEGIN SELECT RAISE(ABORT,'injected'); END",
    );
    await expect(r.save(user.id, b)).rejects.toThrow();
    expect(r.status(user.id).revision).toBe(0);
  });
});
