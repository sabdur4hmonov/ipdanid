import { test, expect, beforeAll, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { GenerationStore } from "../server/generation-store";
import { KitStore } from "../server/kit-store";
import { AccountErasureStore } from "../server/account-erasure-store";
import { decodeGenerationRecipe } from "../server/generation-recipe";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
import { generateClassicLeastSquares } from "../src/core/classic-least-squares";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { previewPng } from "../src/core/preview-png";
import { hash, sequencePayload } from "../src/core/engine";
import type { Instruction } from "../src/core/types";
const stores: KitStore[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  stores.splice(0).forEach((s) => s.close());
});
let guide: Instruction, png: Uint8Array;
beforeAll(async () => {
  const mono = Buffer.from(
    Array.from({ length: 250000 }, (_, k) =>
      Math.round(90 + 120 * ((k % 500) / 500)),
    ),
  );
  const b = {
    version: "protected-generation/1",
    consent: "prepared-target-transfer/1",
    shape: "circle",
    revision: 1,
    lines: 2500,
    target: mono.toString("base64url"),
    secret: randomBytes(32).toString("base64url"),
    requestKey: "generate-unit-fixture",
    preparation: {
      version: "standard-preparation/9",
      sourceHash: "a".repeat(64),
      sourceAspect: 1,
      whiteBackground: "original",
      transform: frameFreePhoto("object", [], "circle", 1),
    },
  };
  guide = await generateClassicLeastSquares(
    decodeGenerationRecipe(b, DEFAULT_STANDARD_KIT).options,
  );
  png = previewPng(guide);
}, 60000);
function setup(now = Date.now) {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  const jobs = new GenerationStore(s, now),
    secret = randomBytes(32).toString("base64url"),
    job = jobs.begin(secret, "unit-generation-first", "a".repeat(64));
  return { s, jobs, secret, job };
}
function account(s: KitStore, key: string) {
  return s.loginKit(
    s.issueKitBatch("admin", "standard-kit-r1", 1, key).codes[0].code,
  );
}
async function ready(jobs: GenerationStore, id: string, i = guide) {
  expect(jobs.running(id)).toBe(true);
  expect(await jobs.complete(id, i, png)).toBe(true);
}
test("static state never releases guide/steps/checkpoints/target before unlock; capability and retry are strict", async () => {
  const { jobs, secret, job } = setup();
  expect(
    jobs.begin(secret, "unit-generation-first", "a".repeat(64)),
  ).toMatchObject({ id: job.id, duplicate: true });
  expect(() =>
    jobs.begin(secret, "unit-generation-first", "b".repeat(64)),
  ).toThrow("conflict");
  expect(() =>
    jobs.state(job.id, randomBytes(32).toString("base64url")),
  ).toThrow("unavailable");
  jobs.progress(job.id, 0.4); // queued cannot acquire fake progress
  expect(jobs.state(job.id, secret).fraction).toBe(0);
  await ready(jobs, job.id);
  const state = jobs.state(job.id, secret);
  expect(Object.keys(state).sort()).toEqual(
    [
      "expiresAt",
      "fraction",
      "height",
      "id",
      "lines",
      "preview",
      "secondsPerConnection",
      "sequenceHash",
      "status",
      "width",
    ].sort(),
  );
  expect(
    "preview" in state &&
      Buffer.from(state.preview, "base64").equals(Buffer.from(png)),
  ).toBe(true);
  expect(JSON.stringify(state)).not.toContain(secret);
});
test("actual signed three-guide unlock, fourth denial, permanent same-guide cross-device reopen, first-account binding", async () => {
  const { s, jobs, secret, job } = setup(),
    a = account(s, "generation-account-first"),
    b = account(s, "generation-account-second");
  await ready(jobs, job.id);
  const first = jobs.unlock(
    a.id,
    job.id,
    secret,
    "generation-unit-device-01234",
    "generation-first-unlock",
  );
  expect(first.instruction.sequenceHash).toBe(guide.sequenceHash);
  expect(first.credits).toBe(2);
  expect(() =>
    jobs.unlock(
      b.id,
      job.id,
      secret,
      "generation-unit-device-01234",
      "generation-other-unlock",
    ),
  ).toThrow("unavailable");
  expect(
    jobs.unlock(
      a.id,
      job.id,
      secret,
      "generation-unit-another-device",
      "generation-reopen-unlock",
    ),
  ).toMatchObject({ duplicate: true, credits: 2 });
  for (let k = 0; k < 3; k++) {
    const copy = structuredClone(guide);
    copy.imageHash = ["b", "c", "d"][k].repeat(64);
    copy.sequenceHash = await hash(sequencePayload(copy));
    const next = jobs.begin(secret, "generation-next-" + k, copy.imageHash);
    await ready(jobs, next.id, copy);
    const unlock = () =>
      jobs.unlock(
        a.id,
        next.id,
        secret,
        "generation-unit-device-01234",
        "generation-next-unlock-" + k,
      );
    if (k < 2) expect(unlock().credits).toBe(1 - k);
    else expect(unlock).toThrow("kit code");
  }
  expect(s.db.prepare("SELECT COUNT(*) n FROM instructions").get()!.n).toBe(3);
  expect(s.kitBalance(b.id)).toBe(3);
});
test("archive failure rolls back owner binding, debit, request and unlock atomically", async () => {
  const { s, jobs, secret, job } = setup(),
    a = account(s, "generation-account-atomic");
  await ready(jobs, job.id);
  vi.spyOn(s, "archiveBuild").mockImplementation(() => {
    throw Error("injected archive failure");
  });
  expect(() =>
    jobs.unlock(
      a.id,
      job.id,
      secret,
      "generation-unit-device-01234",
      "generation-atomic-unlock",
    ),
  ).toThrow("injected");
  expect(s.kitBalance(a.id)).toBe(3);
  expect(
    s.db
      .prepare("SELECT owner_id FROM protected_generations WHERE id=?")
      .get(job.id)!.owner_id,
  ).toBeNull();
  expect(s.db.prepare("SELECT COUNT(*) n FROM build_unlocks").get()!.n).toBe(0);
  expect(s.db.prepare("SELECT COUNT(*) n FROM build_requests").get()!.n).toBe(
    0,
  );
});
test("cancel/expiry fence late completion and restart fails unfinished work without source persistence", async () => {
  let at = Date.now();
  const { s, jobs, secret, job } = setup(() => at);
  expect(jobs.running(job.id)).toBe(true);
  jobs.cancel(job.id, secret);
  expect(await jobs.complete(job.id, guide, png)).toBe(false);
  expect(jobs.state(job.id, secret).status).toBe("cancelled");
  const queued = jobs.begin(
    secret,
    "generation-restart-pending",
    "b".repeat(64),
  );
  const restarted = new GenerationStore(s, () => at);
  expect(restarted.state(queued.id, secret).status).toBe("failed");
  const expiring = restarted.begin(
    secret,
    "generation-expiring-pending",
    "c".repeat(64),
  );
  restarted.running(expiring.id);
  at += 30 * 60000;
  expect(await restarted.complete(expiring.id, guide, png)).toBe(false);
  expect(() => restarted.state(expiring.id, secret)).toThrow("unavailable");
  restarted.prune();
  expect(
    s.db.prepare("SELECT COUNT(*) n FROM protected_generations").get()!.n,
  ).toBe(0);
  const columns = s.db
    .prepare("PRAGMA table_info(protected_generations)")
    .all()
    .map((r) => r.name);
  expect(columns).not.toContain("pixels");
  expect(columns).not.toContain("target");
});
test("global storage cap is bounded and retries do not allocate another row", () => {
  const { s, jobs, secret } = setup();
  for (let k = 1; k < 64; k++)
    jobs.begin(secret, "generation-capacity-" + k, "b".repeat(64));
  expect(() =>
    jobs.begin(secret, "generation-capacity-overflow", "c".repeat(64)),
  ).toThrow("busy");
  expect(
    jobs.begin(secret, "unit-generation-first", "a".repeat(64)).duplicate,
  ).toBe(true);
  expect(
    s.db.prepare("SELECT COUNT(*) n FROM protected_generations").get()!.n,
  ).toBe(64);
});

test('cancelled/failed metadata cannot block live slots or grow without a bound; retries and expiry recover safely', () => {
  let at = 1000;
  const {s,jobs,secret,job} = setup(() => at);
  jobs.cancel(job.id,secret);
  for (let k=1;k<512;k++) {
    const next=jobs.begin(secret,'metadata-capacity-'+k,'b'.repeat(64));
    if(k%2) jobs.fail(next.id); else jobs.cancel(next.id,secret);
  }
  expect(s.db.prepare("SELECT COUNT(*) n FROM protected_generations WHERE status IN ('queued','running','ready')").get()!.n).toBe(0);
  expect(() => jobs.begin(secret,'metadata-capacity-overflow','c'.repeat(64))).toThrow('busy');
  expect(jobs.begin(secret,'unit-generation-first','a'.repeat(64)).duplicate).toBe(true);
  at+=30*60000;
  expect(jobs.begin(secret,'metadata-capacity-after-expiry','d'.repeat(64)).duplicate).toBe(false);
  expect(s.db.prepare('SELECT COUNT(*) n FROM protected_generations').get()!.n).toBe(1);
});

test('the unchanged64MiB byte limit still rejects new allocation and a result that would exceed it',async()=>{
  const {s,jobs,secret,job}=setup();
  const next=jobs.begin(secret,'generation-byte-cap-pending','b'.repeat(64));
  jobs.running(next.id);
  s.db.prepare("UPDATE protected_generations SET status='ready',guide='x',preview=zeroblob(?) WHERE id=?").run(64*1024*1024,job.id);
  expect(()=>jobs.begin(secret,'generation-byte-cap-overflow','c'.repeat(64))).toThrow('busy');
  expect(jobs.begin(secret,'unit-generation-first','a'.repeat(64)).duplicate).toBe(true);
  await expect(jobs.complete(next.id,guide,png)).rejects.toThrow('storage is full');
  expect(jobs.state(next.id,secret).status).toBe('running');
  s.db.prepare("UPDATE protected_generations SET guide=NULL,preview=NULL,status='failed' WHERE id=?").run(job.id);
  expect(await jobs.complete(next.id,guide,png)).toBe(true);
});
test("account erasure deletes owned previews and blocks late owner writes and unlocks", async () => {
  const { s, jobs, secret, job } = setup(),
    code = s.issueKitBatch(
      "admin",
      "standard-kit-r1",
      1,
      "generation-erase-account",
    ).codes[0].code,
    a = s.loginKit(code),
    erasure = new AccountErasureStore(s);
  await ready(jobs, job.id);
  jobs.unlock(
    a.id,
    job.id,
    secret,
    "generation-unit-device-01234",
    "generation-erase-unlock",
  );
  erasure.erase(a.id, { confirm: "erase-account/1", credential: code });
  expect(() => jobs.state(job.id, secret)).toThrow("unavailable");
  expect(() =>
    jobs.unlock(
      a.id,
      job.id,
      secret,
      "generation-unit-device-01234",
      "generation-erased-retry",
    ),
  ).toThrow("erased");
  const next = jobs.begin(
    secret,
    "generation-erased-new-preview",
    "c".repeat(64),
  );
  expect(() =>
    s.db
      .prepare("UPDATE protected_generations SET owner_id=? WHERE id=?")
      .run(a.id, next.id),
  ).toThrow("erased");
  erasure.close();
});
