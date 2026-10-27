import { test, expect, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KitStore } from "../server/kit-store";
import { KitInventory } from "../server/kit-inventory";
import { encryptedKitWriter, readEncryptedKits } from "../server/kit-export";
import { freshTestDatabase } from "../scripts/test-artifacts.mjs";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
function setup(total = 3) {
  const store = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(store);
  const inventory = new KitInventory(store),
    row = inventory.begin(
      "admin",
      "standard-kit-r1",
      total,
      "private-inventory-first",
    );
  return { store, inventory, row };
}
test("staged and incomplete exports cannot create accounts or redeem; ordinary kits stay compatible", () => {
  const { store, inventory, row } = setup();
  let code = "";
  inventory.append(row.id, 1, (c) => {
    code = c[0].code;
  });
  expect(() => store.loginKit(code)).toThrow("unavailable");
  const guest = store.createGuest();
  expect(() => store.redeemKit(guest.id, code)).toThrow("unavailable");
  expect(() => inventory.activate(row.id)).toThrow("incomplete");
  expect(store.db.prepare("SELECT COUNT(*) n FROM kit_grants").get()!.n).toBe(
    0,
  );
  const legacy = store.issueKitBatch("admin", "board", 1, "ordinary-kit-issue");
  expect(store.loginKit(legacy.codes[0].code).credits).toBe(3);
});
test("ready inventory provides exactly three builds, permanent repeat access and independent box ownership", () => {
  const { store, inventory, row } = setup(2);
  const codes: string[] = [];
  inventory.append(row.id, 2, (c) => codes.push(...c.map((x) => x.code)));
  inventory.activate(row.id);
  const a = store.loginKit(codes[0]),
    b = store.loginKit(codes[1]);
  expect(a.credits).toBe(3);
  expect(b.credits).toBe(3);
  for (const c of ["a", "b", "c"])
    store.unlockBuild(
      a.id,
      c.repeat(64),
      "inventory-device-0123456",
      "inventory-unlock-" + c.repeat(8),
    );
  expect(() =>
    store.unlockBuild(
      a.id,
      "d".repeat(64),
      "inventory-device-0123456",
      "inventory-unlock-fourth",
    ),
  ).toThrow("kit code");
  expect(
    store.unlockBuild(
      a.id,
      "a".repeat(64),
      "inventory-another-device-012",
      "inventory-repeat-first",
    ).duplicate,
  ).toBe(true);
  expect(store.loginKit(codes[0]).credits).toBe(0);
  expect(() => store.loginKit(codes[0], b.id)).toThrow("another account");
  expect(store.kitBalance(b.id)).toBe(3);
});
test("export failure rolls back that batch; prior chunks remain blocked and failed inventory cannot activate", () => {
  const { store, inventory, row } = setup();
  let first = "";
  inventory.append(row.id, 1, (c) => {
    first = c[0].code;
  });
  expect(() =>
    inventory.append(row.id, 1, () => {
      throw Error("simulated sink failure");
    }),
  ).toThrow("sink failure");
  expect(inventory.get(row.id).issued).toBe(1);
  expect(store.db.prepare("SELECT COUNT(*) n FROM kit_codes").get()!.n).toBe(1);
  inventory.fail(row.id);
  expect(() => inventory.activate(row.id)).toThrow("incomplete");
  expect(() => store.loginKit(first)).toThrow("unavailable");
  expect(() => inventory.append(row.id, 1, () => {})).toThrow("appendable");
});
test("fixed quota3 overrides an old4 policy; replay and online oversized batches are refused", () => {
  const { store, inventory, row } = setup(1);
  store.setKitPolicy("admin", { ...store.kitPolicy(), quota: 4 });
  let code = "";
  inventory.append(row.id, 1, (c) => {
    code = c[0].code;
  });
  inventory.activate(row.id);
  expect(store.loginKit(code).credits).toBe(3);
  expect(() =>
    inventory.begin("admin", "standard-kit-r1", 1, "private-inventory-first"),
  ).toThrow("already exists");
  expect(() =>
    store.issueKitBatch("admin", "board", 101, "public-too-large"),
  ).toThrow("Invalid");
  expect(() =>
    inventory.begin("admin", "standard", 1000001, "private-invalid-limit"),
  ).toThrow("Invalid");
  expect(() => inventory.append(row.id, 1, () => {})).toThrow("appendable");
});
test("million inventory metadata is bounded and indexed account/batch operations avoid full scans", () => {
  const { store, inventory } = setup(1000000);
  expect(
    inventory.get(store.kitAdmin().inventories[0].id as string).total,
  ).toBe(1000000);
  for (const [query, index] of [
    ["SELECT COUNT(*) FROM kit_codes WHERE account_id=?", "kit_codes_account"],
    ["SELECT hash FROM kit_codes WHERE batch_id=?", "kit_codes_batch"],
  ])
    expect(
      String(
        store.db.prepare("EXPLAIN QUERY PLAN " + query).get("unused")!.detail,
      ),
    ).toContain(index);
});
test("private export roundtrips real random codes without database plaintext", () => {
  const { store, inventory, row } = setup(12),
    key = randomBytes(32),
    file = join(
      freshTestDatabase("private-export").directory,
      "codes.encrypted",
    ),
    writer = encryptedKitWriter(file, key, row),
    codes: string[] = [];
  inventory.append(row.id, 12, (c) => {
    codes.push(...c.map((x) => x.code));
    writer.append(c);
  });
  expect(writer.finish().count).toBe(12);
  const decoded: string[] = [];
  expect(
    readEncryptedKits(file, key, (_, code) => decoded.push(code)).count,
  ).toBe(12);
  expect(decoded.every((v, k) => v === codes[k])).toBe(true);
  const encrypted = readFileSync(file),
    db = JSON.stringify(store.db.prepare("SELECT * FROM kit_codes").all());
  expect(
    codes.every((c) => !encrypted.includes(Buffer.from(c)) && !db.includes(c)),
  ).toBe(true);
  expect(new Set(codes).size).toBe(12);
  expect(codes.every((c) => Buffer.from(c, "base64url").length === 24)).toBe(
    true,
  );
});
test("tamper and wrong keys emit no plaintext callbacks", () => {
  const { inventory, row } = setup(1),
    key = randomBytes(32),
    directory = freshTestDatabase("private-tamper").directory,
    original = join(directory, "original.encrypted"),
    writer = encryptedKitWriter(original, key, row);
  inventory.append(row.id, 1, (c) => writer.append(c));
  writer.finish();
  let calls = 0;
  expect(() =>
    readEncryptedKits(original, randomBytes(32), () => calls++),
  ).toThrow();
  const bytes = readFileSync(original);
  bytes[bytes.length - 17] ^= 1;
  const tampered = join(directory, "tampered.encrypted");
  writeFileSync(tampered, bytes);
  expect(() => readEncryptedKits(tampered, key, () => calls++)).toThrow();
  expect(calls).toBe(0);
});
test("partial ciphertext cannot activate a complete inventory without the owner's explicit finalization", () => {
  const { inventory, row } = setup(2),
    file = join(
      freshTestDatabase("private-partial").directory,
      "partial.encrypted",
    ),
    writer = encryptedKitWriter(file, randomBytes(32), row);
  inventory.append(row.id, 1, (c) => writer.append(c));
  expect(() => writer.finish()).toThrow("incomplete");
  writer.abort();
  expect(() => inventory.activate(row.id)).toThrow("incomplete");
});
test("inventory revocation stops future code login without destroying already issued receipts", () => {
  const { store, inventory, row } = setup(1);
  let code = "";
  inventory.append(row.id, 1, (c) => {
    code = c[0].code;
  });
  inventory.activate(row.id);
  const a = store.loginKit(code);
  store.unlockBuild(
    a.id,
    "a".repeat(64),
    "inventory-device-0123456",
    "inventory-first-unlock",
  );
  inventory.revoke(row.id);
  expect(() => store.loginKit(code)).toThrow("unavailable");
  expect(
    store.unlockBuild(
      a.id,
      "a".repeat(64),
      "inventory-device-0123456",
      "inventory-reopen-unlock",
    ).duplicate,
  ).toBe(true);
});
