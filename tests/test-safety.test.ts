import { afterEach, describe, expect, it, vi } from "vitest";
import { freshTestDatabase } from "../scripts/test-artifacts.mjs";
import { existsSync, mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertTestDatabasePath } from "../server/test-safety.mjs";

describe("isolated test database boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("allocates distinct artifact databases and rejects a protected root before mkdir", () => {
    const root = mkdtempSync(join(tmpdir(), "iprasm-artifacts-"));
    try {
      vi.stubEnv("DATABASE_PATH", "");
      vi.stubEnv("IP_RASM_TEST_ARTIFACTS", root);
      const a = freshTestDatabase("http"), b = freshTestDatabase("http");
      expect(a.databasePath).not.toBe(b.databasePath);
      expect(a.databasePath.startsWith(root)).toBe(true);
      vi.stubEnv("IP_RASM_TEST_ARTIFACTS", join(root, "tmp", "data"));
      expect(() => freshTestDatabase("http")).toThrow("owner data");
      expect(existsSync(join(root, "tmp"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("refuses owner paths including traversal and missing configuration", () => {
    for (const path of [
      undefined,
      "tmp/data/iprasm.sqlite",
      "tmp/data/new/db.sqlite",
      "tmp/tests/../data/db.sqlite",
    ])
      expect(() => assertTestDatabasePath(path)).toThrow();
    expect(() => assertTestDatabasePath(":memory:")).not.toThrow();
    expect(() =>
      assertTestDatabasePath("test-results/api-unique/test.sqlite"),
    ).not.toThrow();
  });
  it("refuses an existing ancestor junction into protected data", () => {
    const root = mkdtempSync(join(tmpdir(), "iprasm-safety-"));
    try {
      const protectedPath = join(root, "tmp", "data");
      mkdirSync(protectedPath, { recursive: true });
      symlinkSync(
        protectedPath,
        join(root, "alias"),
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(() =>
        assertTestDatabasePath(join(root, "alias", "new", "db.sqlite")),
      ).toThrow("owner data");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
