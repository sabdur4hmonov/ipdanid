import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { KitStore } from "../server/kit-store";
import { KitInventory } from "../server/kit-inventory";
import { encryptedKitWriter, readEncryptedKits } from "../server/kit-export";
import { privateKitDirectory } from "./private-kit-paths";

const args = Object.fromEntries(
    process.argv.slice(2).map((s) => {
      const at = s.indexOf("=");
      return [s.slice(0, at), s.slice(at + 1)];
    }),
  ),
  count = Number(args["--count"] ?? 1000000),
  directory = resolve(
    args["--out"] ?? "output/phase16-private/million-kit-20261027",
  );
let store: KitStore | undefined,
  inventory: KitInventory | undefined,
  id: string | undefined,
  writer: ReturnType<typeof encryptedKitWriter> | undefined;
try {
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > 1000000 ||
    Object.keys(args).some((k) => !["--count", "--out"].includes(k))
  )
    throw Error("Invalid or existing private inventory output");
  privateKitDirectory(directory, "new");
  mkdirSync(dirname(directory), { recursive: true });
  mkdirSync(directory, { mode: 0o700 });
  const secrets = {
    CODE_PEPPER: randomBytes(32).toString("base64url"),
    SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
    EXPORT_KEY: randomBytes(32).toString("base64url"),
  };
  writeFileSync(
    join(directory, "private-keys.json"),
    JSON.stringify(secrets, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  store = new KitStore(
    join(directory, "database.sqlite"),
    secrets.CODE_PEPPER,
    secrets.SANDBOX_PAYMENT_KEY,
  );
  inventory = new KitInventory(store);
  const row = inventory.begin(
    "owner-inventory",
    "standard-kit-r1",
    count,
    "initial-private-issue-20261027",
  );
  id = row.id;
  writer = encryptedKitWriter(
    join(directory, "kit-codes.encrypted"),
    Buffer.from(secrets.EXPORT_KEY, "base64url"),
    row,
  );
  const began = performance.now();
  let issued = 0;
  while (issued < count) {
    const n = Math.min(100, count - issued);
    inventory.append(id, n, (codes) => writer!.append(codes));
    issued += n;
    if (issued % 100000 === 0)
      console.log(JSON.stringify({ stage: "issue", issued, total: count }));
  }
  const exported = writer.finish(),
    issueMs = performance.now() - began;
  // Exact streaming verification via a temporary HASH-only SQLite index, not
  // a million plaintext codes in RAM or a probabilistic multiset checksum.
  store.db.exec(
    "PRAGMA temp_store=FILE; CREATE TEMP TABLE export_validation(hash TEXT PRIMARY KEY); BEGIN IMMEDIATE",
  );
  const insert = store.db.prepare("INSERT INTO export_validation VALUES(?)"),
    wanted = new Set([1, Math.ceil(count / 2), count]),
    samples: string[] = [];
  const checked = readEncryptedKits(
    join(directory, "kit-codes.encrypted"),
    Buffer.from(secrets.EXPORT_KEY, "base64url"),
    (ordinal, code) => {
      insert.run(store!.digest(code));
      if (wanted.has(ordinal)) samples.push(code);
    },
  );
  const matching = Number(
    store.db
      .prepare(
        "SELECT COUNT(*) AS n FROM export_validation e JOIN kit_codes c ON c.hash=e.hash JOIN kit_inventory_batches b ON b.batch_id=c.batch_id WHERE b.inventory_id=? AND c.quota=3 AND c.account_id IS NULL AND c.revoked=0 AND c.expires_at IS NULL AND c.credit_days=0",
      )
      .get(id)!.n,
  );
  if (matching !== count || checked.count !== count)
    throw Error("Private inventory exact verification failed");
  store.db.exec("DROP TABLE export_validation; COMMIT");
  inventory.activate(id);
  // Exercise real login/three unlocks/fourth denial/reopen/cross-device under a
  // ROOT ROLLBACK so every delivered production code remains unused.
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const accounts = samples.map((code) => store!.loginKit(code));
    for (let k = 0; k < accounts.length; k++) {
      const account = accounts[k];
      if (account.credits !== 3) throw Error("Inventory quota failed");
      for (const c of ["a", "b", "c"])
        store.unlockBuild(
          account.id,
          c.repeat(64),
          "inventory-test-device-012345",
          "inventory-check-" + c.repeat(8),
        );
      let denied = false;
      try {
        store.unlockBuild(
          account.id,
          "d".repeat(64),
          "inventory-test-device-012345",
          "inventory-fourth-check",
        );
      } catch {
        denied = true;
      }
      if (
        !denied ||
        store.kitBalance(account.id) !== 0 ||
        !store.unlockBuild(
          account.id,
          "a".repeat(64),
          "inventory-other-device-01234",
          "inventory-existing-check",
        ).duplicate
      )
        throw Error("Inventory entitlement guard failed");
    }
    if (accounts.length > 1) {
      let denied = false;
      try {
        store.loginKit(samples[0], accounts[1].id);
      } catch {
        denied = true;
      }
      if (!denied) throw Error("Inventory ownership failed");
    }
  } finally {
    store.db.exec("ROLLBACK");
  }
  const unused = Number(
    store.db
      .prepare("SELECT COUNT(*) AS n FROM kit_codes WHERE account_id IS NULL")
      .get()!.n,
  );
  if (unused !== count) throw Error("Inventory tests consumed a code");
  store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  const report = {
    version: "private-kit-inventory/1",
    inventory: id,
    count,
    quota: 3,
    entropyBits: 192,
    encryptedExport: exported,
    allExportRowsMatchDatabase: true,
    unusedAfterTests: unused,
    sampledEntitlementTests: samples.length,
    issueMs,
    totalVerificationAndIssueMs: performance.now() - began,
    processMaxRssBytes: process.resourceUsage().maxRSS * 1024,
    databaseBytes: statSync(join(directory, "database.sqlite")).size,
    statuses: inventory.get(id).status,
    plaintextCodesPrinted: false,
    plaintextCodesStored: false,
    productionActivated: false,
    meaning:
      "Fresh private deployment inventory, not installed into any live owner database.",
  };
  writeFileSync(
    join(directory, "manifest.json"),
    JSON.stringify(report, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  store.close();
  store = undefined;
  console.log(
    JSON.stringify({
      stage: "complete",
      count,
      quota: 3,
      exactVerified: true,
      allCodesUnused: true,
      issueMs,
      privateOutput: directory,
      valuesPrinted: false,
    }),
  );
} catch {
  writer?.abort();
  if (store) {
    try {
      if (store.db.isTransaction) store.db.exec("ROLLBACK");
      if (inventory && id) inventory.fail(id);
    } catch {}
    try {
      store.close();
    } catch {}
  }
  console.error(
    "Private inventory operation failed; inspect its local staging state. No secret values printed.",
  );
  process.exitCode = 1;
}
