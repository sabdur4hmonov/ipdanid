import { test, expect } from "vitest";
import { nativeConfiguredBase } from "../src/native-server-settings";
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
// @ts-expect-error JavaScript CLI intentionally has no generated declaration.
import { backupSqlite } from "../scripts/backup-sqlite.mjs";
test("release ignores debug server override; debug validates and preserves configured fallback", () => {
  expect(
    nativeConfiguredBase(
      "https://app.example/api",
      false,
      () => "https://other.example/api",
    ),
  ).toBe("https://app.example/api");
  expect(
    nativeConfiguredBase(undefined, true, () => "http://127.0.0.1:4501/api"),
  ).toBe("http://127.0.0.1:4501/api");
  for (const value of [
    "https://u:p@example/api",
    "https://example/api?token=x",
    "javascript:alert(1)",
    "http://remote.example/api",
  ])
    expect(
      nativeConfiguredBase("https://safe.example/api", true, () => value),
    ).toBe("https://safe.example/api");
  expect(
    nativeConfiguredBase(undefined, true, () => {
      throw Error("storage");
    }),
  ).toBeUndefined();
});
test("WAL backup copies committed rows while the writer remains open; immutable archive can restore", async () => {
  mkdirSync("test-results", { recursive: true });
  const dir = mkdtempSync(resolve("test-results/backup14-")),
    source = join(dir, "live.sqlite"),
    db = new DatabaseSync(source);
  try {
    db.exec(
      "PRAGMA journal_mode=WAL;CREATE TABLE rows(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO rows VALUES(1,'first')",
    );
    const result = await backupSqlite(
      source,
      join(dir, "backups"),
      new Date("2026-10-17T00:00:00Z"),
    );
    db.exec("INSERT INTO rows VALUES(2,'later')");
    const restored = new DatabaseSync(result.path, { readOnly: true });
    try {
      expect(restored.prepare("SELECT count(*) as n FROM rows").get()!.n).toBe(
        1,
      );
      expect(restored.prepare("PRAGMA quick_check").get()!.quick_check).toBe(
        "ok",
      );
    } finally {
      restored.close();
    }
    expect(result.bytes).toBeGreaterThan(0);
    await expect(
      backupSqlite(
        source,
        join(dir, "backups"),
        new Date("2026-10-17T00:00:00Z"),
      ),
    ).rejects.toThrow("exists");
    await expect(
      backupSqlite(resolve("tmp/data/forbidden.sqlite"), join(dir, "backups")),
    ).rejects.toThrow("owner data");
    expect(existsSync(result.path)).toBe(true);
  } finally {
    db.close();
  }
});
