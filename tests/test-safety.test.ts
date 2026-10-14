import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertTestDatabasePath } from "../server/test-safety.mjs";

describe("isolated test database boundary", () => {
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
