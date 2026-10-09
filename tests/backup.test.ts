import { it, expect } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { CustomerStore } from "../server/customer-store";
import { AdminAccess } from "../server/admin-access";
import { sealLocalBackup, openLocalBackup } from "../server/backup";
const secret = {
    LOCAL_ADMIN_TOKEN: "o".repeat(32),
    CODE_PEPPER: "p".repeat(32),
    SANDBOX_PAYMENT_KEY: "k".repeat(32),
  },
  phrase = "synthetic backup passphrase only";
function snapshot() {
  const dir = mkdtempSync(join(tmpdir(), "iprasm-backup-test-")),
    path = join(dir, "source.sqlite");
  const s = new CustomerStore(
    path,
    secret.CODE_PEPPER,
    secret.SANDBOX_PAYMENT_KEY,
  );
  s.seed();
  const a = new AdminAccess(s, secret.LOCAL_ADMIN_TOKEN),
    staff = a.issue(secret.LOCAL_ADMIN_TOKEN, {
      name: "Synthetic support",
      role: "support",
      days: 1,
    });
  const user = s.createGuest(),
    code = s.issueCode(
      "dev-circle-120-dark",
      2,
      Date.now() + 60000,
      "synthetic-owner",
    );
  s.redeemCode(user.id, code.code);
  const file = join(dir, "consistent.sqlite");
  s.db.prepare("VACUUM INTO ?").run(file);
  s.close();
  return { dir, bytes: readFileSync(file), user, staff };
}
it("encrypted restoration preserves customer credit/session and scoped staff access without exposing plaintext secrets", () => {
  const source = snapshot(),
    sealed = sealLocalBackup(source.bytes, secret, phrase, 5);
  expect(sealed.toString()).not.toContain(secret.CODE_PEPPER);
  expect(sealed.toString()).not.toContain(source.staff.token);
  expect(sealed.toString()).not.toContain("SQLite format");
  const opened = openLocalBackup(sealed, phrase);
  expect(opened.database.equals(source.bytes)).toBe(true);
  expect(opened.secrets).toEqual(secret);
  const restored = join(source.dir, "restored.sqlite");
  writeFileSync(restored, opened.database);
  const s = new CustomerStore(
    restored,
    opened.secrets.CODE_PEPPER,
    opened.secrets.SANDBOX_PAYMENT_KEY,
  );
  try {
    expect(s.authenticate(source.user.token)).toBe(source.user.id);
    expect(s.balance(source.user.id)).toBe(2);
    expect(
      new AdminAccess(s, opened.secrets.LOCAL_ADMIN_TOKEN).authenticate(
        source.staff.token,
      ).role,
    ).toBe("support");
    expect(
      Object.values(s.db.prepare("PRAGMA integrity_check").get()!)[0],
    ).toBe("ok");
  } finally {
    s.close();
  }
});
it("wrong password, truncated file and tampered ciphertext reject before restoration", () => {
  const source = snapshot(),
    sealed = sealLocalBackup(source.bytes, secret, phrase, 5);
  expect(() => openLocalBackup(sealed, "wrong synthetic passphrase")).toThrow(
    /authenticated/,
  );
  expect(() =>
    openLocalBackup(sealed.subarray(0, sealed.length - 16), phrase),
  ).toThrow(/authenticated/);
  const bad = JSON.parse(sealed.toString());
  const bytes = Buffer.from(bad.data, "base64");
  bytes[0] ^= 1;
  bad.data = bytes.toString("base64");
  expect(() =>
    openLocalBackup(Buffer.from(JSON.stringify(bad)), phrase),
  ).toThrow(/authenticated/);
  expect(() => sealLocalBackup(source.bytes, secret, "weak", 5)).toThrow();
  expect(() => sealLocalBackup(source.bytes, secret, phrase, 99)).toThrow();
});
it("operator CLI creates a consistent encrypted backup and restores only into a new directory", () => {
  const source = snapshot(),
    data = join(source.dir, "tmp", "data");
  mkdirSync(data, { recursive: true });
  writeFileSync(join(data, "iprasm.sqlite"), source.bytes);
  writeFileSync(join(data, "local-secrets.json"), JSON.stringify(secret));
  const script = resolve("scripts/local-backup.ts"),
    loader = import.meta.resolve("tsx");
  const run = (args: string[], pass = phrase) =>
    spawnSync(process.execPath, ["--import", loader, script, ...args], {
      cwd: source.dir,
      env: {
        ...process.env,
        IP_RASM_BACKUP_PASSPHRASE: pass,
        DATABASE_PATH: join(data, "iprasm.sqlite"),
        ...secret,
      },
      encoding: "utf8",
      timeout: 30000,
    });
  const file = join(source.dir, "sealed.iprasm-backup"),
    created = run(["create", file]);
  expect(created.status, created.stderr).toBe(0);
  expect(JSON.parse(created.stdout).consistentSnapshot).toBe(true);
  expect(readFileSync(file, "utf8")).not.toContain(secret.CODE_PEPPER);
  const wrong = join(source.dir, "wrong");
  expect(
    run(["restore", file, wrong], "wrong synthetic passphrase").status,
  ).not.toBe(0);
  expect(existsSync(wrong)).toBe(false);
  const restored = join(source.dir, "inactive-restore"),
    result = run(["restore", file, restored]);
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).activeDataReplaced).toBe(false);
  const s = new CustomerStore(
    join(restored, "iprasm.sqlite"),
    secret.CODE_PEPPER,
    secret.SANDBOX_PAYMENT_KEY,
  );
  try {
    expect(s.authenticate(source.user.token)).toBe(source.user.id);
    expect(s.balance(source.user.id)).toBe(2);
    expect(
      new AdminAccess(s, secret.LOCAL_ADMIN_TOKEN).authenticate(
        source.staff.token,
      ).role,
    ).toBe("support");
  } finally {
    s.close();
  }
  const original = readFileSync(join(restored, "iprasm.sqlite"));
  expect(run(["restore", file, restored]).status).not.toBe(0);
  expect(readFileSync(join(restored, "iprasm.sqlite")).equals(original)).toBe(
    true,
  );
  expect(run(["create", file]).status).not.toBe(0);
}, 60000);
