import { afterEach, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, copyFileSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { fullServerStore } from "./helpers/full-server-store";
import { AccountErasureStore } from "../server/account-erasure-store";
import type { KitStore } from "../server/kit-store";
import { auditRetentionSchema } from "../server/privacy-retention";
// @ts-expect-error JavaScript backup CLI has no declaration.
import { backupSqlite, pruneBackups } from "../scripts/backup-sqlite.mjs";
const open: { store: KitStore; erase: AccountErasureStore }[] = [];
afterEach(() => {
  for (const { store, erase } of open.splice(0)) {
    (erase as any).close?.();
    store.close();
  }
});
const password = "Synthetic-password-restore-123!";
test("restoring a snapshot cannot resurrect an account erased after that snapshot", async () => {
  mkdirSync("test-results", { recursive: true });
  const dir = mkdtempSync(resolve("test-results/c21-erasure-restore-")),
    path = join(dir, "live.sqlite"),
    ledger = join(dir, "erasure.sqlite"),
    snapshot = join(dir, "before-erasure.sqlite"),
    restored = join(dir, "restored.sqlite");
  const first = fullServerStore(path),
    config = { path: ledger, key: "p".repeat(32) },
    erase = Reflect.construct(AccountErasureStore, [
      first.store,
      config,
    ]) as AccountErasureStore;
  open.push({ store: first.store, erase });
  const user = first.store.register(
      first.store.createGuest().id,
      "restore-owner@example.invalid",
      password,
    ),
    other = first.store.register(
      first.store.createGuest().id,
      "restore-other@example.invalid",
      password,
    );
  first.store.db
    .prepare("INSERT INTO projects VALUES(?,?,?,NULL)")
    .run("private-project", user.id, "Private title");
  first.store.db
    .prepare("INSERT INTO instructions VALUES(?,?,?,?,?)")
    .run(
      "private-guide",
      "private-project",
      "hash",
      "private guide body",
      "now",
    );
  await backup(first.store.db, snapshot);
  erase.erase(user.id, { confirm: "erase-account/1", credential: password });
  expect(() => first.store.authenticate(user.token)).toThrow();
  copyFileSync(snapshot, restored);
  const second = fullServerStore(restored),
    replay = Reflect.construct(AccountErasureStore, [
      second.store,
      config,
    ]) as AccountErasureStore;
  open.push({ store: second.store, erase: replay });
  expect(() => second.store.authenticate(user.token)).toThrow();
  expect(() => second.store.login(user.email, password)).toThrow();
  expect(second.store.authenticate(other.token)).toBe(other.id);
  expect(
    second.store.db
      .prepare("SELECT count(*) AS n FROM projects WHERE user_id=?")
      .get(user.id)!.n,
  ).toBe(0);
  expect(
    second.store.db.prepare("SELECT count(*) AS n FROM instructions").get()!.n,
  ).toBe(0);
  expect(second.store.db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(
    auditRetentionSchema(second.store.db).find(
      (r) => r.table === "erasure_ledger_binding",
    )?.disposition,
  ).toBe("antiRevival");
});

function fixture() {
  mkdirSync("test-results", { recursive: true });
  const dir = mkdtempSync(resolve("test-results/c21-journal-")),
    config = { path: join(dir, "erasure.sqlite"), key: "p".repeat(32) };
  const { store } = fullServerStore(join(dir, "main.sqlite")),
    erase = new AccountErasureStore(store, config);
  open.push({ store, erase });
  const user = store.register(
    store.createGuest().id,
    crypto.randomUUID() + "@example.invalid",
    password,
  );
  return { dir, config, store, erase, user };
}
test("journal write failure does not claim success or partially erase the live account",()=>{
  const {config,store,erase,user}=fixture(),journal=new DatabaseSync(config.path);
  journal.exec("CREATE TRIGGER fail_journal BEFORE INSERT ON erasures BEGIN SELECT RAISE(ABORT,'Injected journal failure'); END");
  try{
    expect(()=>erase.erase(user.id,{confirm:"erase-account/1",credential:password})).toThrow("Injected journal failure");
    expect(store.authenticate(user.token)).toBe(user.id);
    expect(store.db.prepare("SELECT count(*) AS n FROM account_erasure").get()!.n).toBe(0);
    expect(journal.prepare("SELECT count(*) AS n FROM erasures").get()!.n).toBe(0);
  }finally{journal.close();}
});
test("a durable intent fences login after scrub rollback, then retries without credentials or duplicate effects", () => {
  const { store, erase, user } = fixture();
  store.db.exec(
    "CREATE TRIGGER fail_erasure BEFORE INSERT ON account_erasure BEGIN SELECT RAISE(ABORT,'Injected scrub failure'); END",
  );
  expect(() =>
    erase.erase(user.id, { confirm: "erase-account/1", credential: password }),
  ).toThrow("Injected scrub failure");
  expect(
    store.db.prepare("SELECT 1 FROM accounts WHERE user_id=?").get(user.id),
  ).toBeDefined();
  expect(() => store.authenticate(user.token)).toThrow("Account erased");
  store.db.exec("DROP TRIGGER fail_erasure");
  expect(erase.replay()).toBe(1);
  expect(erase.replay()).toBe(0);
  expect(() => store.login(user.email, password)).toThrow();
  expect(
    store.db.prepare("SELECT count(*) AS n FROM account_erasure").get()!.n,
  ).toBe(1);
});
test("missing or foreign journal refuses activation of a bound restored database", () => {
  const { dir, config, store, erase } = fixture();
  erase.close();
  // Single checked test files only; no recursive move/delete or owner paths.
  expect(config.path.startsWith(dir)).toBe(true);
  renameSync(config.path, config.path + ".held");
  expect(() => new AccountErasureStore(store, config)).toThrow(
    "Missing current erasure ledger",
  );
  const other = fixture();
  other.erase.close();
  copyFileSync(other.config.path, config.path);
  expect(() => new AccountErasureStore(store, config)).toThrow(
    "Wrong erasure ledger",
  );
});
for (const mutation of ["payload", "remove-entry", "head"] as const)
  test(`authenticated journal refuses ${mutation} corruption`, () => {
    const { config, store, erase, user } = fixture();
    erase.erase(user.id, { confirm: "erase-account/1", credential: password });
    erase.close();
    const journal = new DatabaseSync(config.path);
    if (mutation === "payload")
      journal.exec("UPDATE erasures SET erased_at=erased_at+1");
    if (mutation === "remove-entry") journal.exec("DELETE FROM erasures");
    if (mutation === "head")
      journal.exec("UPDATE ledger_identity SET entry_count=0");
    journal.close();
    expect(() => new AccountErasureStore(store, config)).toThrow(
      /Erasure ledger/,
    );
  });
test("wrong authentication key and app-database path reuse are refused", () => {
  const { dir, config, store, erase } = fixture();
  erase.close();
  expect(
    () => new AccountErasureStore(store, { ...config, key: "q".repeat(32) }),
  ).toThrow("authentication failed");
  expect(
    () =>
      new AccountErasureStore(store, {
        ...config,
        path: join(dir, "main.sqlite"),
      }),
  ).toThrow("separate");
});

test("consistent current-journal backup replays against an older application snapshot", async () => {
  const { dir, config, store, erase, user } = fixture(),
    before = join(dir, "before.sqlite");
  await backup(store.db, before);
  erase.erase(user.id, { confirm: "erase-account/1", credential: password });
  const saved = await backupSqlite(
    config.path,
    join(dir, "backups"),
    new Date("2026-10-25T00:00:00Z"),
    "erasure",
  );
  const restored = join(dir, "restored.sqlite"),
    currentJournal = join(dir, "current-journal.sqlite");
  copyFileSync(before, restored);
  copyFileSync(saved.path, currentJournal);
  const second = fullServerStore(restored),
    replay = new AccountErasureStore(second.store, {
      ...config,
      path: currentJournal,
    });
  open.push({ store: second.store, erase: replay });
  expect(() => second.store.authenticate(user.token)).toThrow();
  expect(() => second.store.login(user.email, password)).toThrow();
  expect(pruneBackups(join(dir, "backups"), Date.now() + 100 * 86400000)).toBe(
    0,
  );
});
