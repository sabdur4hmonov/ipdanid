import { afterEach, expect, test } from "vitest";
import { KitStore } from "../server/kit-store";
import { AccountErasureStore } from "../server/account-erasure-store";
import { PhotoBackupStore } from "../server/photo-backup-store";
import { RecoveryStore } from "../server/recovery-store";
import { GalleryStore } from "../server/gallery-store";
import { galleryPng } from "../server/gallery-image";
import { GALLERY_CONSENT } from "../src/gallery-types";
import { AnalyticsStore } from "../server/analytics-store";
import { PushStore } from "../server/push-store";
import { MockPushAdapter } from "../server/fcm-adapter";
import { TransactionalOutbox } from "../server/transactional-outbox";
import { MockEmailAdapter } from "../server/email-adapter";
import { CommissionStore } from "../server/commission-store";
import { encodePhotoDraft, type PhotoDraft } from "../src/photo-draft";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
const stores: KitStore[] = [];
const password = "Synthetic-password-123!";
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  const photo = new PhotoBackupStore(s);
  new RecoveryStore(s);
  new GalleryStore(s);
  new AnalyticsStore(s);
  new PushStore(s, "p".repeat(32), new MockPushAdapter(), () => undefined);
  new TransactionalOutbox(s, "p".repeat(32), new MockEmailAdapter());
  new CommissionStore(s);
  const e = new AccountErasureStore(s);
  const register = () =>
    s.register(
      s.createGuest().id,
      crypto.randomUUID() + "@example.invalid",
      password,
    );
  return { s, photo, e, user: register(), other: register() };
}
const input = { confirm: "erase-account/1", credential: password };
async function photoBody() {
  const draft: PhotoDraft = {
    version: "editable-photo/1",
    savedAt: Date.now(),
    width: 2,
    height: 2,
    rgba: new Uint8Array(16).fill(128),
    maskEdited: true,
    analysis: {
      mask: { width: 2, height: 2, values: new Float32Array(4).fill(1) },
      faces: [],
      faceUnavailable: true,
      cleanupUnavailable: true,
    },
    shape: "heart",
    kind: "people",
    caption: "Private name",
    adjustment: { x: 0, y: 0, zoom: 1 },
    rotation: 0,
    lines: 3000,
    config: structuredClone(DEFAULT_STANDARD_KIT),
  };
  return {
    consent: "private-photo-backup/1",
    expectedRevision: 0,
    requestKey: crypto.randomUUID(),
    archive: Buffer.from(await encodePhotoDraft(draft)).toString("base64"),
  };
}
test("erasure requires exact confirmation and own current credential without touching another account", () => {
  const { s, e, user, other } = setup();
  for (const b of [
    { ...input, confirm: false },
    { ...input, credential: "Wrong-password-123!" },
    { ...input, user: other.id },
    null,
  ])
    expect(() => e.erase(user.id, b)).toThrow();
  expect(s.authenticate(user.token)).toBe(user.id);
  expect(e.erase(user.id, input)).toMatchObject({
    erased: true,
    activeOrders: 0,
  });
  expect(() => s.authenticate(user.token)).toThrow();
  expect(s.authenticate(other.token)).toBe(other.id);
  expect(() => s.login(user.email, password)).toThrow();
  expect(() => s.recover(user.email, user.recoveryKey, password)).toThrow();
  expect(
    s.db.prepare("SELECT email FROM accounts WHERE user_id=?").get(user.id),
  ).toBeUndefined();
});
test("all sessions and private sources are erased, late photo validation cannot resurrect them", async () => {
  const { s, e, photo, user, other } = setup(),
    b = await photoBody();
  const second = s.login(user.email, password);
  await photo.save(user.id, b);
  await photo.save(other.id, b);
  s.db
    .prepare("INSERT INTO projects VALUES(?,?,?,NULL)")
    .run("project", user.id, "Private title");
  s.db
    .prepare("INSERT INTO instructions VALUES(?,?,?,?,?)")
    .run("instruction", "project", "h", "private guide", "now");
  s.db
    .prepare("INSERT INTO progress VALUES(?,?,?,?,?)")
    .run("instruction", user.id, 1, 3, "now");
  s.db
    .prepare("INSERT INTO account_recovery VALUES(?,?,?,?,?,?)")
    .run("instruction", user.id, 1, "req", "private payload", "private cursor");
  // save() yields during cryptographic validation; erase wins before it resumes.
  const pending = photo.save(user.id, {
    ...b,
    expectedRevision: 1,
    requestKey: crypto.randomUUID(),
  });
  const rejected = expect(pending).rejects.toThrow();
  e.erase(user.id, input);
  await rejected;
  expect(() => s.authenticate(second.token)).toThrow();
  expect(() => photo.read(user.id)).toThrow();
  expect(photo.read(other.id).archive).toBe(b.archive);
  for (const table of [
    "projects",
    "instructions",
    "progress",
    "account_recovery",
  ])
    expect(s.db.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n).toBe(0);
  expect(() =>
    s.db
      .prepare("INSERT INTO projects VALUES(?,?,?,NULL)")
      .run("late", user.id, "late"),
  ).toThrow("Account erased");
  expect(() =>
    s.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run("late", user.id, Date.now() + 60000),
  ).toThrow("Account erased");
  expect(s.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
test("a failed scrub rolls back credentials, sessions, private photo and tombstone together", async () => {
  const { s, e, photo, user } = setup(),
    b = await photoBody();
  await photo.save(user.id, b);
  s.db.exec(
    "CREATE TRIGGER fail_erasure BEFORE INSERT ON account_erasure BEGIN SELECT RAISE(ABORT,'Injected failure'); END;",
  );
  expect(() => e.erase(user.id, input)).toThrow("Injected failure");
  expect(s.authenticate(user.token)).toBe(user.id);
  expect(photo.read(user.id).archive).toBe(b.archive);
  expect(s.login(user.email, password).id).toBe(user.id);
  expect(
    s.db.prepare("SELECT count(*) AS n FROM account_erasure").get()!.n,
  ).toBe(0);
});
test("financial totals survive; terminal contacts vanish and active operations scrub once completed", () => {
  const { s, e, user } = setup(),
    db = s.db;
  const order = (id: string, status: string) =>
    db
      .prepare(
        "INSERT INTO orders(id,user_id,status,total_minor,currency,address,created_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        user.id,
        status,
        500,
        "UZS",
        '{"name":"Private Buyer"}',
        "now",
        id,
      );
  order("closed", "fulfilled");
  order("active", "paid");
  db.prepare("INSERT INTO payments VALUES(?,?,?,?,?,?,?)").run(
    "event",
    "closed",
    "mock",
    "paid",
    500,
    "now",
    "digest",
  );
  db.prepare("INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)").run(
    "credit",
    user.id,
    3,
    "paid",
    "source",
    "now",
  );
  db.prepare("INSERT INTO commissions VALUES(?,?,?,?,?,?)").run(
    "commission",
    user.id,
    "request",
    "private",
    JSON.stringify({
      orderId: "active",
      note: "private",
      acceptPayload: "private",
      guide: { test: "needed artwork" },
    }),
    Date.now(),
  );
  expect(e.erase(user.id, input)).toMatchObject({ activeOrders: 1 });
  expect(
    db.prepare("SELECT address FROM orders WHERE id='closed'").get()!.address,
  ).toBe("{}");
  expect(
    db.prepare("SELECT address FROM orders WHERE id='active'").get()!.address,
  ).toContain("Private Buyer");
  expect(
    db.prepare("SELECT amount_minor FROM payments").get()!.amount_minor,
  ).toBe(500);
  expect(s.balance(user.id)).toBe(3);
  expect(
    JSON.parse(String(db.prepare("SELECT data FROM commissions").get()!.data)),
  ).toMatchObject({
    note: "",
    acceptPayload: null,
    guide: { test: "needed artwork" },
  });
  db.prepare("UPDATE orders SET status='fulfilled' WHERE id='active'").run();
  e.prune();
  expect(
    db.prepare("SELECT address FROM orders WHERE id='active'").get()!.address,
  ).toBe("{}");
  expect(db.prepare("SELECT count(*) AS n FROM commissions").get()!.n).toBe(0);
});
test("kit-only account deletion revokes its code without freeing it for another owner", () => {
  const { s, e } = setup();
  const batch = s.issueKitBatch(
      "owner",
      "erase-batch",
      1,
      "dev-circle-120-dark",
    ),
    code = batch.codes[0].code;
  const user = s.loginKit(code);
  expect(e.preview(user.id).credential).toBe("kit-code");
  e.erase(user.id, { confirm: "erase-account/1", credential: code });
  expect(() => s.loginKit(code)).toThrow();
  expect(
    s.db
      .prepare("SELECT account_id,revoked FROM kit_codes WHERE batch_id=?")
      .get(batch.id),
  ).toMatchObject({ account_id: user.id, revoked: 1 });
});
test("gallery pixels, device tokens and telemetry are removed and blocked from returning", () => {
  const { s, e, user, other } = setup(),
    g = new GalleryStore(s),
    a = new AnalyticsStore(s),
    push = new PushStore(
      s,
      "p".repeat(32),
      new MockPushAdapter(),
      () => undefined,
    );
  const payload = {
    title: "Private work",
    alias: "Maker",
    review: "",
    rating: 0,
    image: galleryPng(new Uint8Array(96 * 96 * 3).fill(128), 96, 96).toString(
      "base64",
    ),
    requestKey: crypto.randomUUID(),
    consentVersion: GALLERY_CONSENT,
    consent: true,
    finished: true,
    rights: true,
    publish: true,
  };
  g.submit(user.id, payload);
  g.submit(other.id, { ...payload, requestKey: crypto.randomUUID() });
  const device = {
    installationId: crypto.randomUUID(),
    installationSecret: "s".repeat(43),
    token: "synthetic-device-token-123456789",
    platform: "web",
    locale: "en",
    promotions: false,
    consent: true,
  };
  push.register(user.id, device);
  a.save(user.id, { enabled: true, revision: 0 });
  a.record(user.id, {
    kind: "photo-selected",
    shape: "circle",
    consentRevision: 1,
    requestKey: crypto.randomUUID(),
  });
  e.erase(user.id, input);
  expect(
    s.db
      .prepare("SELECT count(*) AS n FROM gallery_posts WHERE user_id=?")
      .get(user.id)!.n,
  ).toBe(0);
  expect(
    s.db
      .prepare("SELECT count(*) AS n FROM gallery_posts WHERE user_id=?")
      .get(other.id)!.n,
  ).toBe(1);
  for (const table of [
    "push_devices",
    "analytics_events",
    "analytics_preferences",
  ])
    expect(s.db.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n).toBe(0);
  expect(() =>
    g.submit(user.id, { ...payload, requestKey: crypto.randomUUID() }),
  ).toThrow();
  expect(() => push.register(user.id, device)).toThrow();
  expect(() => a.save(user.id, { enabled: true, revision: 0 })).toThrow();
});
